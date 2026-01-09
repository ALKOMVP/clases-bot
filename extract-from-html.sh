#!/bin/bash
# Extraer referencias de archivos del HTML

DEPLOY_URL="https://7324963f.clases-bot.pages.dev"
OUTPUT_DIR="recover-deploy-complete"

mkdir -p "$OUTPUT_DIR"

echo "Extrayendo todas las referencias de archivos JS del HTML..."
curl -s "$DEPLOY_URL" > "$OUTPUT_DIR/index.html"

echo "Archivos JS encontrados:"
grep -o 'src="[^"]*\.js"' "$OUTPUT_DIR/index.html" | sort -u | head -30

echo ""
echo "Archivos relacionados con cancelaciones/calendario:"
grep -o 'src="[^"]*"' "$OUTPUT_DIR/index.html" | grep -iE "(cancelacion|calendario|navbar)" | sort -u

echo ""
echo "HTML guardado en: $OUTPUT_DIR/index.html"
