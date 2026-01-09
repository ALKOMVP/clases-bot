#!/bin/bash

# Script para extraer código de WhatsApp desde el navegador
# Este script genera instrucciones y un template para pegar código

set -e

OUTPUT_DIR="recovered-whatsapp"
mkdir -p "$OUTPUT_DIR"

echo "=== Instrucciones para extraer código de WhatsApp desde producción ==="
echo ""
echo "1. Abre la aplicación en producción en tu navegador"
echo "2. Abre DevTools (F12)"
echo "3. Ve a la pestaña 'Sources' o 'Network'"
echo ""
echo "=== Método 1: Desde Sources ==="
echo "1. En Sources, busca archivos que contengan 'whatsapp' o 'webhook'"
echo "2. Busca el archivo _worker.js o archivos en /api/whatsapp/"
echo "3. Copia el código y guárdalo en: $OUTPUT_DIR/webhook-route.js"
echo ""
echo "=== Método 2: Desde Network ==="
echo "1. En Network, filtra por 'whatsapp' o 'webhook'"
echo "2. Haz click en el request"
echo "3. Ve a la pestaña 'Response' o 'Preview'"
echo "4. Copia el código y guárdalo"
echo ""
echo "=== Método 3: Buscar en código minificado ==="
echo "1. En Sources, busca archivos .js"
echo "2. Busca términos como:"
echo "   - 'cancelar'"
echo "   - 'agendar'"
echo "   - 'ver clases' o 'ver mis clases'"
echo "   - 'whatsapp'"
echo "   - 'webhook'"
echo "3. Copia las funciones relacionadas"
echo ""
echo "=== Template para pegar código ==="
echo ""
echo "Crea un archivo con el código que encuentres:"
echo "  $OUTPUT_DIR/webhook-code.js"
echo ""
echo "Luego ejecuta:"
echo "  node scripts/analyze-whatsapp-code.js $OUTPUT_DIR/webhook-code.js"
echo ""

