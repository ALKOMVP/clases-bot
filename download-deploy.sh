#!/bin/bash
# Script para descargar assets del deploy

DEPLOY_URL="https://7324963f.clases-bot.pages.dev"
OUTPUT_DIR="recover-deploy"

mkdir -p "$OUTPUT_DIR"

echo "Descargando _worker.js..."
curl -s "$DEPLOY_URL/_worker.js" -o "$OUTPUT_DIR/_worker.js"

echo "Descargando chunks de cancelaciones..."
curl -s "$DEPLOY_URL/_next/static/chunks/app/cancelaciones/page.js" -o "$OUTPUT_DIR/cancelaciones-page.js" 2>/dev/null || echo "No encontrado"

echo "Buscando archivos relacionados..."
for file in "components_Navbar" "app_calendario_page" "app_cancelaciones"; do
  curl -s "$DEPLOY_URL/_next/static/chunks/${file}.js" -o "$OUTPUT_DIR/${file}.js" 2>/dev/null || true
done

echo "Descarga completada en $OUTPUT_DIR/"
