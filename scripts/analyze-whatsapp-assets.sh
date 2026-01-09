#!/bin/bash

# Script para analizar los assets descargados y extraer el código del webhook de WhatsApp

set -e

OUTPUT_DIR="recovered-assets"

if [ ! -d "$OUTPUT_DIR" ]; then
    echo "❌ Error: No se encontró el directorio $OUTPUT_DIR"
    echo "Ejecuta primero: ./scripts/download-assets-from-deploy.sh"
    exit 1
fi

echo "🔍 Analizando assets descargados..."
echo ""

# Buscar código relacionado con WhatsApp
echo "=== Buscando referencias a WhatsApp ==="
grep -r -i "whatsapp\|webhook" "$OUTPUT_DIR" 2>/dev/null | head -20 || echo "No se encontraron referencias directas"

echo ""
echo "=== Buscando funciones de cancelar, agendar, ver clases ==="
grep -r -i "cancelar\|agendar\|ver.*clases\|ver mis clases" "$OUTPUT_DIR" 2>/dev/null | head -20 || echo "No se encontraron referencias"

echo ""
echo "=== Buscando rutas de API ==="
grep -r -i "/api/whatsapp\|/whatsapp/webhook" "$OUTPUT_DIR" 2>/dev/null | head -20 || echo "No se encontraron rutas"

echo ""
echo "=== Analizando estructura de archivos ==="
find "$OUTPUT_DIR" -type f -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | while read file; do
    size=$(wc -c < "$file" 2>/dev/null || echo "0")
    echo "📄 $(basename "$file"): ${size} bytes"
done

echo ""
echo "=== Buscando patrones de Next.js API routes ==="
grep -r -E "export.*(GET|POST|PUT|DELETE|PATCH)" "$OUTPUT_DIR" 2>/dev/null | head -10 || echo "No se encontraron exports de métodos HTTP"

echo ""
echo "=== Buscando referencias a base de datos ==="
grep -r -i "DB\.\|database\|d1\|reserva\|clase\|usuario" "$OUTPUT_DIR" 2>/dev/null | head -20 || echo "No se encontraron referencias a BD"

