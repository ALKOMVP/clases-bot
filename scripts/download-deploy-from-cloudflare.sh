#!/bin/bash

# Script para descargar código de un deploy de Cloudflare Pages usando la API
# Uso: ./scripts/download-deploy-from-cloudflare.sh [DEPLOY_ID]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que CLOUDFLARE_API_TOKEN esté configurado
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}Error: CLOUDFLARE_API_TOKEN no está configurado${NC}"
    echo ""
    echo "Para obtener un token:"
    echo "1. Ve a https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Crea un token con permisos:"
    echo "   - Account: Cloudflare Pages:Read"
    echo "   - Zone: Zone:Read (si necesitas acceso a zonas)"
    echo "3. Exporta el token:"
    echo "   export CLOUDFLARE_API_TOKEN='tu-token-aqui'"
    echo ""
    exit 1
fi

# Configuración del proyecto
PROJECT_NAME="clases-bot"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

# Si no hay ACCOUNT_ID, intentar obtenerlo del wrangler.toml o pedirlo
if [ -z "$ACCOUNT_ID" ]; then
    if [ -f "wrangler.toml" ]; then
        ACCOUNT_ID=$(grep -E "^account_id\s*=" wrangler.toml | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/' | sed 's/.*=\s*\([^ ]*\).*/\1/')
    fi
    
    if [ -z "$ACCOUNT_ID" ]; then
        echo -e "${YELLOW}No se encontró ACCOUNT_ID en wrangler.toml${NC}"
        echo "Puedes encontrarlo en: https://dash.cloudflare.com/"
        echo "O exportarlo: export CLOUDFLARE_ACCOUNT_ID='tu-account-id'"
        read -p "Ingresa tu Account ID: " ACCOUNT_ID
    fi
fi

echo -e "${GREEN}=== Descargando código desde Cloudflare Pages ===${NC}"
echo "Proyecto: $PROJECT_NAME"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Directorio de salida
OUTPUT_DIR="recovered-from-cloudflare"
mkdir -p "$OUTPUT_DIR"

# Función para hacer requests a la API
api_request() {
    local endpoint="$1"
    local method="${2:-GET}"
    curl -s -X "$method" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.cloudflare.com/client/v4$endpoint"
}

# 1. Obtener lista de deploys
echo -e "${YELLOW}1. Obteniendo lista de deploys...${NC}"
DEPLOYS_RESPONSE=$(api_request "/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments")

if echo "$DEPLOYS_RESPONSE" | grep -q '"success":false'; then
    echo -e "${RED}Error al obtener deploys:${NC}"
    echo "$DEPLOYS_RESPONSE" | jq '.' 2>/dev/null || echo "$DEPLOYS_RESPONSE"
    exit 1
fi

# Mostrar los últimos 5 deploys
echo ""
echo -e "${GREEN}Últimos 5 deploys:${NC}"
echo "$DEPLOYS_RESPONSE" | jq -r '.result[] | "\(.id) - \(.created_on) - \(.stage.stage)"' | head -5

# Si se proporcionó un DEPLOY_ID, usarlo; si no, usar el más reciente
if [ -n "$1" ]; then
    DEPLOY_ID="$1"
    echo ""
    echo -e "${YELLOW}Usando deploy ID proporcionado: $DEPLOY_ID${NC}"
else
    DEPLOY_ID=$(echo "$DEPLOYS_RESPONSE" | jq -r '.result[0].id')
    echo ""
    echo -e "${YELLOW}Usando el deploy más reciente: $DEPLOY_ID${NC}"
fi

# 2. Obtener detalles del deploy específico
echo ""
echo -e "${YELLOW}2. Obteniendo detalles del deploy $DEPLOY_ID...${NC}"
DEPLOY_DETAILS=$(api_request "/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOY_ID")

if echo "$DEPLOY_DETAILS" | grep -q '"success":false'; then
    echo -e "${RED}Error al obtener detalles del deploy:${NC}"
    echo "$DEPLOY_DETAILS" | jq '.' 2>/dev/null || echo "$DEPLOY_DETAILS"
    exit 1
fi

# Guardar detalles del deploy
echo "$DEPLOY_DETAILS" | jq '.' > "$OUTPUT_DIR/deploy-details.json"
echo -e "${GREEN}✅ Detalles guardados en $OUTPUT_DIR/deploy-details.json${NC}"

# Mostrar información del deploy
echo ""
echo -e "${GREEN}Información del deploy:${NC}"
echo "$DEPLOY_DETAILS" | jq -r '
    "ID: \(.result.id)",
    "Estado: \(.result.latest_stage.name)",
    "Creado: \(.result.created_on)",
    "URL: \(.result.url)",
    "Alias: \(.result.aliases[]? // "N/A")"
'

# 3. Intentar obtener el código fuente del deploy
echo ""
echo -e "${YELLOW}3. Intentando obtener código fuente...${NC}"

# Cloudflare Pages no expone directamente el código fuente a través de la API
# Pero podemos intentar obtener información sobre los assets y funciones

# Obtener información de los assets
ASSETS_INFO=$(echo "$DEPLOY_DETAILS" | jq '.result.stages[] | select(.name == "deploy") | .')
if [ -n "$ASSETS_INFO" ]; then
    echo "$ASSETS_INFO" > "$OUTPUT_DIR/deploy-assets.json"
    echo -e "${GREEN}✅ Información de assets guardada${NC}"
fi

# 4. Intentar descargar el worker.js o _worker.js si está disponible
echo ""
echo -e "${YELLOW}4. Intentando descargar archivos del deploy...${NC}"

DEPLOY_URL=$(echo "$DEPLOY_DETAILS" | jq -r '.result.url // ""')
if [ -n "$DEPLOY_URL" ]; then
    echo "URL del deploy: $DEPLOY_URL"
    
    # Intentar descargar algunos archivos comunes
    FILES_TO_TRY=(
        "/_worker.js"
        "/worker.js"
        "/_routes.json"
    )
    
    for file in "${FILES_TO_TRY[@]}"; do
        echo -n "Intentando descargar $file... "
        if curl -s -f -o "$OUTPUT_DIR$(basename $file)" "$DEPLOY_URL$file" 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
        else
            echo -e "${RED}❌${NC}"
        fi
    done
fi

# 5. Buscar código relacionado con WhatsApp en los detalles
echo ""
echo -e "${YELLOW}5. Buscando referencias a WhatsApp en el deploy...${NC}"

if grep -i "whatsapp\|webhook" "$OUTPUT_DIR/deploy-details.json" > "$OUTPUT_DIR/whatsapp-references.txt" 2>/dev/null; then
    echo -e "${GREEN}✅ Referencias encontradas en $OUTPUT_DIR/whatsapp-references.txt${NC}"
    cat "$OUTPUT_DIR/whatsapp-references.txt"
else
    echo -e "${YELLOW}⚠️ No se encontraron referencias directas${NC}"
fi

# 6. Intentar obtener el código desde el navegador (instrucciones)
echo ""
echo -e "${GREEN}=== Siguientes pasos ===${NC}"
echo ""
echo "Cloudflare Pages no expone el código fuente completo a través de la API."
echo "Para obtener el código del webhook de WhatsApp, puedes:"
echo ""
echo "1. ${YELLOW}Desde el navegador:${NC}"
echo "   - Abre: $DEPLOY_URL"
echo "   - Abre DevTools (F12)"
echo "   - Ve a Sources → Page → _worker.js o busca archivos relacionados con WhatsApp"
echo "   - Copia el código JavaScript"
echo ""
echo "2. ${YELLOW}Desde Network tab:${NC}"
echo "   - Abre DevTools → Network"
echo "   - Filtra por 'whatsapp' o 'webhook'"
echo "   - Revisa los requests y responses"
echo ""
echo "3. ${YELLOW}Desde el código minificado:${NC}"
echo "   - Busca archivos .js en Sources"
echo "   - Busca funciones relacionadas con 'cancelar', 'agendar', 'ver clases'"
echo ""
echo "Los archivos descargados están en: $OUTPUT_DIR/"
echo ""

