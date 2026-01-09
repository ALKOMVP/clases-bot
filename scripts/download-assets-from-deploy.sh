#!/bin/bash

# Script mejorado para descargar assets específicos del deploy de Cloudflare Pages
# Uso: ./scripts/download-assets-from-deploy.sh [DEPLOY_ID]

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ Error: CLOUDFLARE_API_TOKEN no está configurado${NC}"
    echo ""
    echo "Para obtener un token:"
    echo "1. Ve a https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Crea un token con permisos: Cloudflare Pages:Read"
    echo "3. Exporta: export CLOUDFLARE_API_TOKEN='tu-token'"
    exit 1
fi

PROJECT_NAME="clases-bot"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

# Obtener Account ID
if [ -z "$ACCOUNT_ID" ]; then
    if [ -f "wrangler.toml" ]; then
        # Intentar obtener del wrangler.toml (aunque probablemente no esté)
        ACCOUNT_ID=$(grep -E "^account_id\s*=" wrangler.toml 2>/dev/null | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/' | sed 's/.*=\s*\([^ ]*\).*/\1/' || echo "")
    fi
    
    if [ -z "$ACCOUNT_ID" ]; then
        echo -e "${YELLOW}⚠️  No se encontró ACCOUNT_ID${NC}"
        echo "Puedes encontrarlo en: https://dash.cloudflare.com/ (barra lateral derecha)"
        read -p "Ingresa tu Account ID: " ACCOUNT_ID
    fi
fi

echo -e "${BLUE}=== Descargando Assets del Deploy ===${NC}"
echo "Proyecto: $PROJECT_NAME"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Función para hacer requests a la API
api_request() {
    local endpoint="$1"
    curl -s -X GET \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.cloudflare.com/client/v4$endpoint"
}

# Obtener el deploy ID
DEPLOY_ID="${1:-}"
if [ -z "$DEPLOY_ID" ]; then
    echo -e "${YELLOW}📋 Obteniendo el deploy más reciente...${NC}"
    DEPLOYS_RESPONSE=$(api_request "/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments")
    
    if echo "$DEPLOYS_RESPONSE" | grep -q '"success":false'; then
        echo -e "${RED}❌ Error al obtener deploys:${NC}"
        echo "$DEPLOYS_RESPONSE" | jq '.' 2>/dev/null || echo "$DEPLOYS_RESPONSE"
        exit 1
    fi
    
    DEPLOY_ID=$(echo "$DEPLOYS_RESPONSE" | jq -r '.result[0].id')
    echo -e "${GREEN}✅ Deploy más reciente: $DEPLOY_ID${NC}"
else
    echo -e "${GREEN}✅ Usando deploy: $DEPLOY_ID${NC}"
fi

# Obtener información del deploy
echo ""
echo -e "${YELLOW}📦 Obteniendo información del deploy...${NC}"
DEPLOY_INFO=$(api_request "/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOY_ID")

if echo "$DEPLOY_INFO" | grep -q '"success":false'; then
    echo -e "${RED}❌ Error al obtener información del deploy:${NC}"
    echo "$DEPLOY_INFO" | jq '.' 2>/dev/null || echo "$DEPLOY_INFO"
    exit 1
fi

DEPLOY_URL=$(echo "$DEPLOY_INFO" | jq -r '.result.url // ""')
if [ -z "$DEPLOY_URL" ] || [ "$DEPLOY_URL" = "null" ]; then
    echo -e "${RED}❌ No se pudo obtener la URL del deploy${NC}"
    exit 1
fi

echo -e "${GREEN}✅ URL del deploy: $DEPLOY_URL${NC}"

# Crear directorio de salida
OUTPUT_DIR="recovered-assets"
mkdir -p "$OUTPUT_DIR"
echo "$DEPLOY_INFO" | jq '.' > "$OUTPUT_DIR/deploy-info.json"
echo -e "${GREEN}✅ Información del deploy guardada en $OUTPUT_DIR/deploy-info.json${NC}"

# Lista de archivos a intentar descargar (prioridad alta)
echo ""
echo -e "${YELLOW}📥 Descargando archivos del webhook...${NC}"

HIGH_PRIORITY_FILES=(
    "server-functions/default/handler.mjs"
    "server-functions/default/handler.js"
    "_worker.js"
    "worker.js"
)

MEDIUM_PRIORITY_FILES=(
    "server-functions/default/cache.cjs"
    "server-functions/default/composable-cache.cjs"
    "_routes.json"
    "routes.json"
)

# Función para descargar archivo
download_file() {
    local file="$1"
    local output_path="$2"
    local url="${DEPLOY_URL}/${file}"
    
    echo -n "  📄 $file ... "
    
    if curl -s -f -o "$output_path" "$url" 2>/dev/null; then
        local size=$(wc -c < "$output_path" 2>/dev/null || echo "0")
        if [ "$size" -gt 0 ]; then
            echo -e "${GREEN}✅ (${size} bytes)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  (vacío)${NC}"
            rm -f "$output_path"
            return 1
        fi
    else
        echo -e "${RED}❌${NC}"
        return 1
    fi
}

# Descargar archivos de alta prioridad
echo ""
echo -e "${BLUE}Archivos de alta prioridad:${NC}"
for file in "${HIGH_PRIORITY_FILES[@]}"; do
    output_file="$OUTPUT_DIR/$(basename "$file" | sed 's/[^a-zA-Z0-9._-]/_/g')"
    download_file "$file" "$output_file"
done

# Descargar archivos de prioridad media
echo ""
echo -e "${BLUE}Archivos de prioridad media:${NC}"
for file in "${MEDIUM_PRIORITY_FILES[@]}"; do
    output_file="$OUTPUT_DIR/$(basename "$file" | sed 's/[^a-zA-Z0-9._-]/_/g')"
    download_file "$file" "$output_file"
done

# Intentar buscar en chunks de JavaScript
echo ""
echo -e "${YELLOW}🔍 Buscando código de WhatsApp en archivos descargados...${NC}"

# Buscar referencias a WhatsApp
FOUND_FILES=()
for file in "$OUTPUT_DIR"/*.{js,mjs,cjs} 2>/dev/null; do
    if [ -f "$file" ]; then
        if grep -qi "whatsapp\|webhook\|cancelar\|agendar\|ver.*clases" "$file" 2>/dev/null; then
            FOUND_FILES+=("$file")
            echo -e "${GREEN}✅ Encontrado en: $(basename "$file")${NC}"
        fi
    fi
done

if [ ${#FOUND_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No se encontraron referencias directas en los archivos descargados${NC}"
    echo "El código puede estar en los chunks de JavaScript que necesitan descargarse manualmente"
fi

# Resumen
echo ""
echo -e "${GREEN}=== Resumen ===${NC}"
echo "Archivos descargados en: $OUTPUT_DIR/"
echo "Total de archivos con referencias a WhatsApp: ${#FOUND_FILES[@]}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo "1. Revisa los archivos en $OUTPUT_DIR/"
echo "2. Busca 'whatsapp', 'webhook', 'cancelar', 'agendar' en los archivos"
echo "3. Si no encuentras nada, el código puede estar en los chunks de JavaScript"
echo "   que necesitas descargar manualmente desde la interfaz de Cloudflare"

