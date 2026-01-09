#!/bin/bash
# Script completo para recuperar código del deploy

DEPLOY_URL="https://7324963f.clases-bot.pages.dev"
OUTPUT_DIR="recover-deploy-complete"

mkdir -p "$OUTPUT_DIR"

echo "=== Método 1: Descargar _worker.js ==="
curl -s "$DEPLOY_URL/_worker.js" -o "$OUTPUT_DIR/_worker.js"
echo "✓ _worker.js descargado ($(wc -c < "$OUTPUT_DIR/_worker.js") bytes)"

echo ""
echo "=== Método 2: Buscar source maps ==="
curl -s "$DEPLOY_URL/_next/static/chunks/" 2>&1 | grep -o 'href="[^"]*\.map"' | head -10

echo ""
echo "=== Método 3: Listar todos los chunks disponibles ==="
curl -s "$DEPLOY_URL/_next/static/chunks/" 2>&1 | grep -o 'href="[^"]*\.js"' | head -20

echo ""
echo "=== Método 4: Intentar acceder a rutas de API ==="
echo "Probando rutas de API para ver estructura..."
for route in "api/cancelaciones" "api/reservas" "api/clases"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/$route")
  echo "  /$route: $status"
done

echo ""
echo "=== Método 5: Extraer información del HTML ==="
curl -s "$DEPLOY_URL" | grep -o 'src="[^"]*"' | grep -E "(cancelacion|Navbar|calendario)" | head -10

echo ""
echo "Descarga completada. Revisa $OUTPUT_DIR/"
