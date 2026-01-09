#!/bin/bash

# Script para extraer URLs de chunks del HTML y descargarlos
# Uso: ./scripts/extract-and-download-chunks.sh [DEPLOY_URL]

set -e

DEPLOY_URL="${1:-https://clases-bot.pages.dev}"
DEPLOY_URL="${DEPLOY_URL%/}"

OUTPUT_DIR="recovered-assets/chunks"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Extrayendo URLs de chunks desde: $DEPLOY_URL"
echo ""

# Descargar la página principal
echo "📥 Descargando página principal..."
MAIN_HTML=$(curl -s "$DEPLOY_URL/")

# Extraer URLs de chunks JavaScript
echo "🔍 Buscando chunks de JavaScript..."
CHUNK_URLS=$(echo "$MAIN_HTML" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u)

if [ -z "$CHUNK_URLS" ]; then
    echo "⚠️  No se encontraron chunks en la página principal"
    echo "Intentando desde /api/whatsapp/webhook..."
    
    # Intentar obtener chunks desde el endpoint de API
    API_HTML=$(curl -s "$DEPLOY_URL/api/whatsapp/webhook" || echo "")
    if [ -n "$API_HTML" ]; then
        CHUNK_URLS=$(echo "$API_HTML" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u)
    fi
fi

if [ -z "$CHUNK_URLS" ]; then
    echo "❌ No se encontraron chunks. Intentando con chunks conocidos..."
    
    # Lista de chunks conocidos basados en la imagen del usuario
    KNOWN_CHUNKS=(
        "_next/static/chunks/244-8b04922dbf370508.js"
        "_next/static/chunks/4bd1b696-cf72ae8a39fa05aa.js"
        "_next/static/chunks/964-13036fef2dc48ea1.js"
        "_next/static/chunks/framework-f75312fc4004b783.js"
        "_next/static/chunks/main-app-ec9ecdbb23713c0f.js"
    )
    
    for chunk in "${KNOWN_CHUNKS[@]}"; do
        CHUNK_URLS="$CHUNK_URLS
/$chunk"
    done
fi

# Descargar cada chunk
echo ""
echo "📥 Descargando chunks..."
DOWNLOADED=0
for chunk_url in $CHUNK_URLS; do
    chunk_name=$(basename "$chunk_url" | sed 's/[^a-zA-Z0-9._-]/_/g')
    output_file="$OUTPUT_DIR/$chunk_name"
    
    echo -n "  📄 $chunk_url ... "
    if curl -s -f -L -o "$output_file" "${DEPLOY_URL}${chunk_url}" 2>/dev/null; then
        size=$(wc -c < "$output_file" 2>/dev/null || echo "0")
        if [ "$size" -gt 100 ]; then
            echo "✅ (${size} bytes)"
            ((DOWNLOADED++))
        else
            echo "⚠️  (muy pequeño)"
            rm -f "$output_file"
        fi
    else
        echo "❌"
    fi
done

echo ""
echo "✅ Descargados $DOWNLOADED chunks"
echo ""

# Buscar código de WhatsApp en los chunks
echo "🔍 Buscando código de WhatsApp en chunks..."
FOUND_IN_CHUNKS=()
for file in "$OUTPUT_DIR"/*.js; do
    if [ -f "$file" ]; then
        if grep -qi "whatsapp\|webhook\|cancelar\|agendar\|ver.*clases" "$file" 2>/dev/null; then
            FOUND_IN_CHUNKS+=("$file")
            echo "✅ Encontrado en: $(basename "$file")"
        fi
    fi
done

if [ ${#FOUND_IN_CHUNKS[@]} -gt 0 ]; then
    echo ""
    echo "🎯 Archivos con código de WhatsApp:"
    for file in "${FOUND_IN_CHUNKS[@]}"; do
        echo "  - $file"
    done
else
    echo "⚠️  No se encontraron referencias directas en los chunks"
fi

