#!/bin/bash
# Script para comparar el código actual con lo que debería estar en producción

echo "=== Comparando código local con producción ==="
echo ""

DEPLOY_URL="https://7324963f.clases-bot.pages.dev"

echo "1. Verificando Navbar..."
LOCAL_HAS_CANCELACIONES=$(grep -c "Cancelaciones" components/Navbar.tsx 2>/dev/null || echo "0")
echo "   Local tiene Cancelaciones: $LOCAL_HAS_CANCELACIONES"
echo "   Producción debería tener: 1"
echo ""

echo "2. Verificando página Cancelaciones..."
if [ -f "app/cancelaciones/page.tsx" ]; then
  echo "   ✓ Página existe localmente"
  LOCAL_LINES=$(wc -l < app/cancelaciones/page.tsx)
  echo "   Líneas de código: $LOCAL_LINES"
else
  echo "   ✗ Página NO existe"
fi
echo ""

echo "3. Verificando modal del calendario..."
HAS_TEMPORALES=$(grep -c "Alumnos Temporales" app/calendario/page.tsx 2>/dev/null || echo "0")
HAS_FIJOS=$(grep -c "Alumnos Fijos" app/calendario/page.tsx 2>/dev/null || echo "0")
echo "   Alumnos Temporales: $HAS_TEMPORALES"
echo "   Alumnos Fijos: $HAS_FIJOS"
echo ""

echo "4. Verificando API de reservas..."
HAS_TELEFONO=$(grep -c "telefono" app/api/reservas/route.ts 2>/dev/null || echo "0")
echo "   Incluye teléfono: $HAS_TELEFONO"
echo ""

echo "5. Probando endpoints en producción..."
echo "   /api/cancelaciones: $(curl -s -o /dev/null -w '%{http_code}' $DEPLOY_URL/api/cancelaciones 2>/dev/null || echo 'N/A')"
echo "   /cancelaciones: $(curl -s -o /dev/null -w '%{http_code}' $DEPLOY_URL/cancelaciones 2>/dev/null || echo 'N/A')"
echo ""

echo "=== Resumen ==="
if [ "$LOCAL_HAS_CANCELACIONES" -gt 0 ] && [ -f "app/cancelaciones/page.tsx" ] && [ "$HAS_TEMPORALES" -gt 0 ] && [ "$HAS_FIJOS" -gt 0 ]; then
  echo "✓ Todo el código recreado está presente"
else
  echo "⚠ Faltan algunos componentes"
fi

