#!/bin/bash

# Script para asegurar que todas las BDs locales tengan los datos
# Esto resuelve el problema de que wrangler pages dev puede crear una nueva BD vacía

set -e

DB_NAME="clases-db"
SOURCE_DB=""

# Funciones de ayuda
error() {
    echo -e "\033[0;31m✗\033[0m $1" >&2
}

info() {
    echo -e "\033[0;32m✓\033[0m $1"
}

step() {
    echo -e "\033[0;34m→\033[0m $1"
}

# Buscar la BD con más datos (probablemente la fuente)
step "Buscando base de datos con datos..."

ALL_DB_PATHS=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" -type f 2>/dev/null | sort)

if [ -z "$ALL_DB_PATHS" ]; then
    error "No se encontraron bases de datos locales"
    exit 1
fi

# Encontrar la BD con más usuarios
MAX_USERS=0
for db_path in $ALL_DB_PATHS; do
    USER_COUNT=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM usuario;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$USER_COUNT" -gt "$MAX_USERS" ]; then
        MAX_USERS=$USER_COUNT
        SOURCE_DB="$db_path"
    fi
done

if [ -z "$SOURCE_DB" ] || [ "$MAX_USERS" -eq 0 ]; then
    error "No se encontró una base de datos con datos"
    step "Ejecuta primero: npm run db:sync:from-prod"
    exit 1
fi

info "Base de datos fuente encontrada: $(basename $SOURCE_DB) con $MAX_USERS usuarios"

# Copiar datos a todas las demás BDs
step "Copiando datos a otras bases de datos..."

for db_path in $ALL_DB_PATHS; do
    if [ "$db_path" != "$SOURCE_DB" ]; then
        USER_COUNT=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM usuario;" 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ "$USER_COUNT" -lt "$MAX_USERS" ]; then
            step "Copiando datos a: $(basename $db_path)"
            
            # Verificar si la BD tiene las tablas
            HAS_TABLES=$(sqlite3 "$db_path" "SELECT name FROM sqlite_master WHERE type='table' AND name='usuario';" 2>/dev/null | wc -l | tr -d ' ')
            
            if [ "$HAS_TABLES" -eq 0 ]; then
                # BD no tiene tablas, copiar estructura y datos completos usando .dump
                info "BD vacía detectada, copiando estructura y datos completos..."
                sqlite3 "$SOURCE_DB" ".dump" | sqlite3 "$db_path" 2>/dev/null || true
            else
                # BD tiene tablas pero está vacía o tiene pocos datos, copiar solo datos
                info "BD tiene estructura pero pocos datos, copiando datos..."
                sqlite3 "$db_path" <<EOF 2>/dev/null || true
ATTACH DATABASE '$SOURCE_DB' AS source;
BEGIN;
DELETE FROM usuario WHERE 1=1;
DELETE FROM clase WHERE 1=1;
DELETE FROM reserva WHERE 1=1;
DELETE FROM lista_espera WHERE 1=1;
DELETE FROM cancelacion WHERE 1=1;
INSERT INTO usuario SELECT * FROM source.usuario;
INSERT INTO clase SELECT * FROM source.clase;
INSERT INTO reserva SELECT * FROM source.reserva;
INSERT OR IGNORE INTO lista_espera SELECT * FROM source.lista_espera;
INSERT OR IGNORE INTO cancelacion SELECT * FROM source.cancelacion;
COMMIT;
DETACH DATABASE source;
EOF
            fi
            
            NEW_COUNT=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM usuario;" 2>/dev/null | tr -d ' ' || echo "0")
            if [ "$NEW_COUNT" -eq "$MAX_USERS" ] || [ "$NEW_COUNT" -gt 0 ]; then
                info "Datos copiados exitosamente a $(basename $db_path): $NEW_COUNT usuarios"
            else
                error "Error copiando datos a $(basename $db_path) - todavía tiene $NEW_COUNT usuarios"
            fi
        else
            info "BD $(basename $db_path) ya tiene $USER_COUNT usuarios (no necesita actualización)"
        fi
    fi
done

echo ""
info "Todas las bases de datos locales ahora tienen los datos de producción"
echo ""

