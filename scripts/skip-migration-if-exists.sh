#!/bin/bash
# Script helper para manejar migraciones que pueden fallar si las columnas ya existen
# Uso: Este script verifica si las columnas de la migración 0005 ya existen

DB_NAME="clases-db"

# Verificar si fecha_clase existe
FECHA_CLASE_EXISTS=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) FROM pragma_table_info('reserva') WHERE name = 'fecha_clase';" 2>/dev/null | grep -E "^[0-9]+" | head -1 | tr -d ' ' || echo "0")

# Verificar si es_reasignacion existe  
ES_REASIGNACION_EXISTS=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) FROM pragma_table_info('reserva') WHERE name = 'es_reasignacion';" 2>/dev/null | grep -E "^[0-9]+" | head -1 | tr -d ' ' || echo "0")

if [ "$FECHA_CLASE_EXISTS" -gt "0" ] && [ "$ES_REASIGNACION_EXISTS" -gt "0" ]; then
    echo "✓ Las columnas fecha_clase y es_reasignacion ya existen en la tabla reserva"
    echo "  La migración 0005 puede ser marcada como aplicada"
    echo ""
    echo "Para marcar la migración como aplicada manualmente:"
    echo "  wrangler d1 migrations list clases-db --local"
    exit 0
else
    echo "Las columnas no existen completamente. La migración debe ejecutarse."
    exit 1
fi
