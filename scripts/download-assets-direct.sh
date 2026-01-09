#!/bin/bash

# Script para descargar assets directamente desde la URL del deploy
# Uso: ./scripts/download-assets-direct.sh [DEPLOY_URL]

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obtener URL del deploy
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  No se proporcionó URL del deploy${NC}"
    echo ""
    echo "Uso: ./scripts/download-assets-direct.sh [DEPLOY_URL]"
    echo ""
    echo "Ejemplo:"
    echo "  ./scripts/download-assets-direct.sh https://7324963f.clases-bot.pages.dev"
    echo ""
    echo "O puedes proporcionar la URL ahora:"
    read -p "URL del deploy: " DEPLOY_URL
else
    DEPLOY_URL="$1"
fi

# Limpiar URL (remover trailing slash)
DEPLOY_URL="${DEPLOY_URL%/}"

echo -e "${BLUE}=== Descargando Assets desde: $DEPLOY_URL ===${NC}"
echo ""

# Crear directorio de salida
OUTPUT_DIR="recovered-assets"
mkdir -p "$OUTPUT_DIR"

# Lista de archivos a intentar descargar
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

# También intentar descargar algunos chunks que podrían contener el código
CHUNK_FILES=(
    "_next/static/chunks/main-app-*.js"
    "_next/static/chunks/*-api-*.js"
    "_next/static/chunks/*-route-*.js"
)

# Función para descargar archivo
download_file() {
    local file="$1"
    local output_path="$2"
    local url="${DEPLOY_URL}/${file}"
    
    echo -n "  📄 $file ... "
    
    if curl -s -f -L -o "$output_path" "$url" 2>/dev/null; then
        local size=$(wc -c < "$output_path" 2>/dev/null || echo "0")
        if [ "$size" -gt 100 ]; then
            echo -e "${GREEN}✅ (${size} bytes)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  (muy pequeño: ${size} bytes)${NC}"
            rm -f "$output_path"
            return 1
        fi
    else
        echo -e "${RED}❌${NC}"
        return 1
    fi
}

# Descargar archivos de alta prioridad
echo -e "${BLUE}Archivos de alta prioridad:${NC}"
DOWNLOADED_COUNT=0
for file in "${HIGH_PRIORITY_FILES[@]}"; do
    output_file="$OUTPUT_DIR/$(basename "$file" | sed 's/[^a-zA-Z0-9._-]/_/g')"
    if download_file "$file" "$output_file"; then
        ((DOWNLOADED_COUNT++))
    fi
done

# Descargar archivos de prioridad media
echo ""
echo -e "${BLUE}Archivos de prioridad media:${NC}"
for file in "${MEDIUM_PRIORITY_FILES[@]}"; do
    output_file="$OUTPUT_DIR/$(basename "$file" | sed 's/[^a-zA-Z0-9._-]/_/g')"
    if download_file "$file" "$output_file"; then
        ((DOWNLOADED_COUNT++))
    fi
done

# Intentar hacer un request al endpoint de webhook para ver si responde
echo ""
echo -e "${YELLOW}🔍 Probando endpoint de webhook...${NC}"
WEBHOOK_RESPONSE=$(curl -s -X POST "${DEPLOY_URL}/api/whatsapp/webhook" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' 2>&1 || echo "ERROR")

if echo "$WEBHOOK_RESPONSE" | grep -qi "error\|not found\|404"; then
    echo -e "${YELLOW}⚠️  El endpoint /api/whatsapp/webhook no está disponible o retorna error${NC}"
else
    echo -e "${GREEN}✅ El endpoint responde (puede estar protegido)${NC}"
    echo "$WEBHOOK_RESPONSE" > "$OUTPUT_DIR/webhook-response.txt"
fi

# Buscar código relacionado con WhatsApp en archivos descargados
echo ""
echo -e "${YELLOW}🔍 Buscando código de WhatsApp en archivos descargados...${NC}"

FOUND_FILES=()
shopt -s nullglob
for file in "$OUTPUT_DIR"/*.js "$OUTPUT_DIR"/*.mjs "$OUTPUT_DIR"/*.cjs; do
    if [ -f "$file" ]; then
        if grep -qi "whatsapp\|webhook\|cancelar\|agendar\|ver.*clases" "$file" 2>/dev/null; then
            FOUND_FILES+=("$file")
            echo -e "${GREEN}✅ Encontrado en: $(basename "$file")${NC}"
        fi
    fi
done

# Resumen
echo ""
echo -e "${GREEN}=== Resumen ===${NC}"
echo "Archivos descargados: $DOWNLOADED_COUNT"
echo "Archivos con referencias a WhatsApp: ${#FOUND_FILES[@]}"
echo "Directorio: $OUTPUT_DIR/"
echo ""

if [ ${#FOUND_FILES[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Archivos con código de WhatsApp encontrados:${NC}"
    for file in "${FOUND_FILES[@]}"; do
        echo "  - $(basename "$file")"
    done
    echo ""
    echo "Ejecuta: ./scripts/analyze-whatsapp-assets.sh para analizar en detalle"
else
    echo -e "${YELLOW}⚠️  No se encontraron referencias directas${NC}"
    echo "El código puede estar en:"
    echo "  1. Los chunks de JavaScript (necesitas descargarlos manualmente)"
    echo "  2. En el código minificado del _worker.js"
    echo "  3. En archivos que no son accesibles públicamente"
fi

