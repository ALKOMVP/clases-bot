#!/bin/bash

# Script para sincronizar la estructura de la base de datos local con Cloudflare
# Aplica todas las migraciones y verifica que las clases estén inicializadas

# No usar set -e aquí porque queremos manejar errores de migraciones manualmente
# set -e

echo "========================================="
echo "Sincronizando estructura de BD local"
echo "========================================="
echo ""

DB_NAME="clases-db"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    error "wrangler no está instalado. Instálalo con: npm install -g wrangler"
    exit 1
fi

info "Aplicando migraciones locales..."

# Aplicar todas las migraciones (wrangler aplicará solo las que falten)
MIGRATION_OUTPUT=$(wrangler d1 migrations apply $DB_NAME --local 2>&1) || true
MIGRATION_EXIT_CODE=$?

# Verificar si el error es solo por columnas duplicadas (normal si las columnas ya existen)
if echo "$MIGRATION_OUTPUT" | grep -qi "duplicate column name"; then
    warn "Algunas columnas ya existen (esto es normal si la migración se aplicó antes)"
    warn "Las columnas fecha_clase y es_reasignacion ya están presentes."
    warn "Continuando con las migraciones restantes..."
    echo ""
    
    # Intentar aplicar las migraciones restantes manualmente
    # Las migraciones 0006 y 0007 usan CREATE TABLE IF NOT EXISTS, así que son seguras
    if [ -f "migrations/0006_create_lista_espera.sql" ]; then
        step "Aplicando migración 0006 (lista_espera)..."
        if wrangler d1 execute $DB_NAME --local --file="migrations/0006_create_lista_espera.sql" > /dev/null 2>&1; then
            info "Migración 0006 aplicada correctamente"
        else
            warn "Migración 0006 puede que ya esté aplicada (esto es normal)"
        fi
    fi
    
    if [ -f "migrations/0007_create_cancelacion.sql" ]; then
        step "Aplicando migración 0007 (cancelacion)..."
        if wrangler d1 execute $DB_NAME --local --file="migrations/0007_create_cancelacion.sql" > /dev/null 2>&1; then
            info "Migración 0007 aplicada correctamente"
        else
            warn "Migración 0007 puede que ya esté aplicada (esto es normal)"
        fi
    fi
    
    echo ""
    info "Migraciones aplicadas (algunas advertencias por columnas duplicadas son normales)"
elif echo "$MIGRATION_OUTPUT" | grep -qi "success\|applied"; then
    info "Migraciones aplicadas correctamente"
else
    # Si hay un error real (no solo advertencias), mostrarlo pero continuar
    warn "Hubo algunos problemas con las migraciones, pero continuando..."
    echo "$MIGRATION_OUTPUT" | head -20
fi

echo ""
info "Verificando estructura de la base de datos..."

# Verificar que las tablas existan
echo "Verificando tablas..."
wrangler d1 execute $DB_NAME --local --command="
SELECT name FROM sqlite_master 
WHERE type='table' 
ORDER BY name;
" | grep -E "(usuario|clase|reserva|lista_espera|cancelacion)" && info "Tablas principales encontradas" || warn "Algunas tablas pueden no existir"

echo ""
info "Verificando columnas de la tabla 'usuario'..."
wrangler d1 execute $DB_NAME --local --command="
PRAGMA table_info(usuario);
" | grep -E "(nombre|apellido|telefono|activo)" && info "Columnas de usuario correctas" || warn "Faltan columnas en usuario"

echo ""
info "Verificando columnas de la tabla 'reserva'..."
wrangler d1 execute $DB_NAME --local --command="
PRAGMA table_info(reserva);
" | grep -E "(fecha_clase|es_reasignacion)" && info "Columnas de reserva correctas" || warn "Faltan columnas en reserva (fecha_clase, es_reasignacion)"

echo ""
info "Verificando si las clases están inicializadas..."

CLASES_COUNT=$(wrangler d1 execute $DB_NAME --local --command="
SELECT COUNT(*) as count FROM clase;
" | grep -E "^[0-9]+" | head -1 | tr -d ' ')

if [ "$CLASES_COUNT" -eq "0" ] || [ -z "$CLASES_COUNT" ]; then
    warn "No hay clases en la base de datos"
    warn "Las clases se inicializarán automáticamente la primera vez que visites /clases"
    warn "O puedes inicializarlas manualmente desde la interfaz web en la sección 'Clases'"
else
    info "Hay $CLASES_COUNT clases en la base de datos"
fi

echo ""
echo "========================================="
info "Sincronización completada"
echo "========================================="
echo ""
echo "Para ejecutar la aplicación con la base de datos local, usa:"
echo "  wrangler pages dev .next --local --d1=DB=$DB_NAME"
echo ""
echo "O si ya tienes la app corriendo, reiníciala para que use la BD local."
echo ""

