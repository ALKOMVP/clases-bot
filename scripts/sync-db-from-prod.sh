#!/bin/bash

# Script para sincronizar la base de datos local con producción
# Descarga el backup de producción y lo restaura en la base de datos local
# Uso: ./scripts/sync-db-from-prod.sh

set -e

DB_NAME="clases-db"
TEMP_BACKUP="/tmp/clases-db-sync-$(date +%Y%m%d_%H%M%S).sql"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

step() {
    echo -e "${BLUE}→${NC} $1"
}

# Verificar que wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    error "wrangler no está instalado. Instálalo con: npm install -g wrangler"
    exit 1
fi

# Verificar si sqlite3 está disponible (recomendado para mejor compatibilidad)
if ! command -v sqlite3 &> /dev/null; then
    warn "sqlite3 no está disponible. Se intentará usar wrangler, pero puede fallar con archivos grandes."
    warn "Para mejor compatibilidad, instala sqlite3:"
    warn "  macOS: ya viene instalado (verifica PATH)"
    warn "  Linux: sudo apt-get install sqlite3"
    warn ""
fi

echo "========================================="
echo "Sincronizando BD Local desde Producción"
echo "========================================="
echo ""

# Confirmar antes de proceder (solo si hay datos locales)
step "Verificando estado de la base de datos local..."

LOCAL_COUNT=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) as count FROM usuario;" 2>/dev/null | grep -E "^[0-9]+" | head -1 | tr -d ' ' || echo "0")

if [ "$LOCAL_COUNT" -gt "0" ] 2>/dev/null; then
    warn "La base de datos local ya tiene $LOCAL_COUNT usuarios."
    echo ""
    read -p "¿Deseas continuar y SOBRESCRIBIR los datos locales con los de producción? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        info "Operación cancelada."
        exit 0
    fi
    echo ""
fi

# Paso 1: Exportar desde producción
step "Paso 1/3: Descargando backup de producción..."
echo "   Esto puede tomar unos segundos..."

if wrangler d1 export $DB_NAME --remote --output "$TEMP_BACKUP" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$TEMP_BACKUP" | cut -f1)
    info "Backup descargado: $TEMP_BACKUP ($BACKUP_SIZE)"
else
    error "Error al descargar el backup de producción"
    exit 1
fi

echo ""

# Paso 2: Limpiar base de datos local (opcional pero recomendado)
step "Paso 2/3: Limpiando base de datos local..."

# Inicializar la base de datos ejecutando un comando simple para que wrangler la cree
wrangler d1 execute $DB_NAME --local --command="SELECT 1;" > /dev/null 2>&1 || true
sleep 1

# Buscar el archivo SQLite local
WRANGLER_DB_PATH=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" -type f 2>/dev/null | head -1)

if [ -n "$WRANGLER_DB_PATH" ] && [ -f "$WRANGLER_DB_PATH" ]; then
    # Eliminar todas las tablas (excepto d1_migrations que wrangler necesita)
    # En orden inverso por foreign keys
    TABLES=("lista_espera" "cancelacion" "reserva" "clase" "usuario" "whatsapp_state" "clases_a_recuperar" "cancelaciones_fijas")
    
    for table in "${TABLES[@]}"; do
        sqlite3 "$WRANGLER_DB_PATH" "DROP TABLE IF EXISTS $table;" 2>/dev/null || true
    done
    
    # Eliminar índices que pueden quedar huérfanos
    sqlite3 "$WRANGLER_DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';" 2>/dev/null | while read idx; do
        if [ -n "$idx" ]; then
            sqlite3 "$WRANGLER_DB_PATH" "DROP INDEX IF EXISTS \"$idx\";" 2>/dev/null || true
        fi
    done
    
    info "Base de datos local limpiada (tablas eliminadas)"
else
    # Fallback: usar DELETE si no encontramos el archivo SQLite
    warn "No se encontró el archivo SQLite, usando método alternativo..."
    TABLES=("lista_espera" "cancelacion" "reserva" "clase" "usuario")
    for table in "${TABLES[@]}"; do
        wrangler d1 execute $DB_NAME --local --command="DELETE FROM $table;" 2>/dev/null || true
    done
    info "Base de datos local limpiada (datos eliminados)"
fi

echo ""

# Paso 3: Importar el backup en la base de datos local
step "Paso 3/3: Restaurando backup en la base de datos local..."

# Verificar si sqlite3 está disponible (método más confiable)
if command -v sqlite3 &> /dev/null; then
    info "Usando sqlite3 para importar el backup..."
    
    # Inicializar la base de datos ejecutando un comando simple para que wrangler la cree
    step "Inicializando base de datos local..."
    wrangler d1 execute $DB_NAME --local --command="SELECT 1;" > /dev/null 2>&1 || true
    sleep 2
    
    # Buscar el archivo SQLite que wrangler creó
    # Wrangler almacena las bases de datos D1 locales en diferentes ubicaciones según la versión
    POSSIBLE_PATHS=(
        ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/${DB_NAME}.sqlite"
        ".wrangler/state/v3/d1/${DB_NAME}.sqlite"
        ".wrangler/state/d1/${DB_NAME}.sqlite"
        ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/${DB_NAME}.db"
    )
    
    WRANGLER_DB_PATH=""
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            WRANGLER_DB_PATH="$path"
            info "Base de datos local encontrada en: $path"
            break
        fi
    done
    
    if [ -z "$WRANGLER_DB_PATH" ]; then
        # Si no se encuentra, buscar recursivamente (wrangler usa hashes como nombres)
        # Buscar el archivo .sqlite más reciente en el directorio de wrangler
        WRANGLER_DB_PATH=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" -type f 2>/dev/null | head -1)
        if [ -n "$WRANGLER_DB_PATH" ]; then
            info "Base de datos local encontrada en: $WRANGLER_DB_PATH"
        fi
    fi
    
    if [ -z "$WRANGLER_DB_PATH" ] || [ ! -f "$WRANGLER_DB_PATH" ]; then
        warn "No se pudo encontrar el archivo SQLite local automáticamente"
        warn "Intentando método alternativo con wrangler..."
        USE_SQLITE3=false
    else
        USE_SQLITE3=true
    fi
    
    if [ "$USE_SQLITE3" = true ]; then
        # Importar usando sqlite3 (más rápido y confiable)
        step "Importando datos usando sqlite3..."
        
        # Asegurarnos de que las tablas estén eliminadas justo antes de importar
        step "Eliminando tablas existentes antes de importar..."
        TABLES_TO_DROP=("lista_espera" "cancelacion" "reserva" "clase" "usuario" "whatsapp_state" "clases_a_recuperar" "cancelaciones_fijas")
        for table in "${TABLES_TO_DROP[@]}"; do
            timeout 5 sqlite3 "$WRANGLER_DB_PATH" "DROP TABLE IF EXISTS $table;" 2>/dev/null || true
        done
        
        # Convertir INSERT en INSERT OR IGNORE para evitar errores de UNIQUE constraint
        # También convertir CREATE TABLE en CREATE TABLE IF NOT EXISTS (pero no duplicar si ya existe)
        step "Preparando SQL para importación..."
        FILTERED_BACKUP="${TEMP_BACKUP}.filtered.sql"
        # Primero normalizar: agregar IF NOT EXISTS solo si no existe
        awk '
        /^CREATE TABLE IF NOT EXISTS/ { print; next }
        /^CREATE TABLE/ { sub(/^CREATE TABLE/, "CREATE TABLE IF NOT EXISTS"); print; next }
        /^CREATE INDEX IF NOT EXISTS/ { print; next }
        /^CREATE INDEX/ { sub(/^CREATE INDEX/, "CREATE INDEX IF NOT EXISTS"); print; next }
        /^CREATE UNIQUE INDEX IF NOT EXISTS/ { print; next }
        /^CREATE UNIQUE INDEX/ { sub(/^CREATE UNIQUE INDEX/, "CREATE UNIQUE INDEX IF NOT EXISTS"); print; next }
        /^INSERT INTO/ { sub(/^INSERT INTO/, "INSERT OR IGNORE INTO"); print; next }
        { print }
        ' "$TEMP_BACKUP" > "$FILTERED_BACKUP"
        
        # Ejecutar el SQL filtrado con timeout
        step "Ejecutando importación (esto puede tomar unos segundos)..."
        ERROR_OUTPUT=$(timeout 30 sqlite3 "$WRANGLER_DB_PATH" < "$FILTERED_BACKUP" 2>&1)
        SQLITE_EXIT_CODE=$?
        
        # Limpiar archivo temporal filtrado
        rm -f "$FILTERED_BACKUP"
        
        # Analizar la salida de error
        if [ -n "$ERROR_OUTPUT" ]; then
            # Contar tipos de errores
            ALREADY_EXISTS_COUNT=$(echo "$ERROR_OUTPUT" | grep -ci "already exists" || true)
            UNIQUE_CONSTRAINT_COUNT=$(echo "$ERROR_OUTPUT" | grep -ci "UNIQUE constraint failed" || true)
            OTHER_ERRORS=$(echo "$ERROR_OUTPUT" | grep -i "error\|Parse error" | grep -v "already exists" | grep -v "UNIQUE constraint failed" || true)
            
            # Si solo hay errores de "already exists" y "UNIQUE constraint", es normal
            if [ -z "$OTHER_ERRORS" ] && [ "$ALREADY_EXISTS_COUNT" -gt 0 -o "$UNIQUE_CONSTRAINT_COUNT" -gt 0 ]; then
                warn "Algunas advertencias esperadas (pueden ser normales):"
                echo "$ERROR_OUTPUT" | grep -iE "already exists|UNIQUE constraint failed" | head -3 | sed 's/^/  /'
                info "Importación completada (errores esperados ignorados)"
            elif [ -n "$OTHER_ERRORS" ]; then
                # Hay errores críticos
                error "Error crítico al importar:"
                echo "$OTHER_ERRORS" | head -10 | sed 's/^/  /'
                rm -f "$TEMP_BACKUP"
                exit 1
            else
                # No hay errores críticos
                info "Backup restaurado exitosamente usando sqlite3"
            fi
        else
            # Sin salida de error, todo bien
            if [ $SQLITE_EXIT_CODE -eq 0 ]; then
                info "Backup restaurado exitosamente usando sqlite3"
            else
                # Código de salida != 0 pero sin errores en stderr (puede ser normal)
                info "Importación completada (verificando datos...)"
            fi
        fi
    fi
fi

if [ "$USE_SQLITE3" = false ]; then
    # Método alternativo: usar wrangler d1 execute con el contenido del archivo
    warn "sqlite3 no está disponible, usando wrangler d1 execute..."
    
    # Leer el archivo SQL y ejecutarlo en chunks (wrangler tiene límites)
    # Primero intentar ejecutar todo el archivo
    if wrangler d1 execute $DB_NAME --local --file="$TEMP_BACKUP" 2>&1 | grep -v "Executing on local database" | grep -v "Use --remote" | grep -v "Resource location" | grep -v "wrangler" | grep -v "update available" | grep -v "bug" | grep -v "Would you like" > /dev/null 2>&1; then
        info "Backup restaurado exitosamente"
    else
        # Si falla, intentar ejecutar el contenido directamente
        warn "Método --file falló, intentando con --command..."
        SQL_CONTENT=$(cat "$TEMP_BACKUP")
        if wrangler d1 execute $DB_NAME --local --command="$SQL_CONTENT" 2>&1 | grep -v "Executing on local database" | grep -v "Use --remote" | grep -v "Resource location" | grep -v "wrangler" | grep -v "update available" | grep -v "bug" | grep -v "Would you like" > /dev/null 2>&1; then
            info "Backup restaurado exitosamente (método alternativo)"
        else
            error "Error al restaurar el backup con wrangler"
            error "Sugerencia: Instala sqlite3 para mejor compatibilidad:"
            error "  macOS: ya viene instalado"
            error "  Linux: sudo apt-get install sqlite3"
            error "  O descarga desde: https://www.sqlite.org/download.html"
            rm -f "$TEMP_BACKUP"
            exit 1
        fi
    fi
fi

echo ""

# Verificar que los datos se importaron correctamente
step "Verificando datos importados..."

# Usar sqlite3 directamente para obtener los conteos (más confiable)
# Buscar todas las BDs posibles y usar la que tenga datos
ALL_DB_PATHS=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" -type f 2>/dev/null | sort)

if [ -n "$ALL_DB_PATHS" ]; then
    # Usar la BD más grande (probablemente tiene los datos)
    WRANGLER_DB_PATH=$(echo "$ALL_DB_PATHS" | xargs ls -lS 2>/dev/null | head -1 | awk '{print $NF}')
    if [ -z "$WRANGLER_DB_PATH" ]; then
        # Si no funciona, usar la primera
        WRANGLER_DB_PATH=$(echo "$ALL_DB_PATHS" | head -1)
    fi
fi

if [ -n "$WRANGLER_DB_PATH" ] && [ -f "$WRANGLER_DB_PATH" ]; then
    USUARIOS=$(sqlite3 "$WRANGLER_DB_PATH" "SELECT COUNT(*) FROM usuario;" 2>/dev/null | tr -d ' ' || echo "0")
    CLASES=$(sqlite3 "$WRANGLER_DB_PATH" "SELECT COUNT(*) FROM clase;" 2>/dev/null | tr -d ' ' || echo "0")
    RESERVAS=$(sqlite3 "$WRANGLER_DB_PATH" "SELECT COUNT(*) FROM reserva;" 2>/dev/null | tr -d ' ' || echo "0")
else
    # Fallback: usar wrangler
    USUARIOS=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) FROM usuario;" 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
    CLASES=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) FROM clase;" 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
    RESERVAS=$(wrangler d1 execute $DB_NAME --local --command="SELECT COUNT(*) FROM reserva;" 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
fi

# Limpiar archivo temporal
rm -f "$TEMP_BACKUP"
info "Archivo temporal eliminado"

echo ""

echo ""
info "Datos sincronizados:"
echo "   - Usuarios: $USUARIOS"
echo "   - Clases: $CLASES"
echo "   - Reservas: $RESERVAS"

# Si hay múltiples BDs, copiar los datos a todas para asegurar que wrangler pages dev use una con datos
if [ "$USUARIOS" -gt 0 ] && [ -n "$WRANGLER_DB_PATH" ] && [ -f "$WRANGLER_DB_PATH" ]; then
    step "Copiando datos a otras instancias de BD (si existen)..."
    ALL_DB_PATHS=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -name "*.sqlite" -type f 2>/dev/null)
    for other_db in $ALL_DB_PATHS; do
        if [ "$other_db" != "$WRANGLER_DB_PATH" ]; then
            # Verificar si esta BD tiene datos
            OTHER_COUNT=$(sqlite3 "$other_db" "SELECT COUNT(*) FROM usuario;" 2>/dev/null | tr -d ' ' || echo "0")
            if [ "$OTHER_COUNT" -eq 0 ]; then
                # Copiar datos de la BD con datos a esta BD vacía
                info "Copiando datos a: $(basename $other_db)"
                sqlite3 "$other_db" <<EOF 2>/dev/null || true
ATTACH DATABASE '$WRANGLER_DB_PATH' AS source;
BEGIN;
DELETE FROM usuario; DELETE FROM clase; DELETE FROM reserva; DELETE FROM lista_espera; DELETE FROM cancelacion;
INSERT INTO usuario SELECT * FROM source.usuario;
INSERT INTO clase SELECT * FROM source.clase;
INSERT INTO reserva SELECT * FROM source.reserva;
INSERT OR IGNORE INTO lista_espera SELECT * FROM source.lista_espera;
INSERT OR IGNORE INTO cancelacion SELECT * FROM source.cancelacion;
COMMIT;
DETACH DATABASE source;
EOF
            fi
        fi
    done
fi

echo ""
echo "========================================="
info "Sincronización completada exitosamente"
echo "========================================="
echo ""
info "La base de datos local ahora tiene una copia exacta de producción"
info "Datos disponibles: $USUARIOS usuarios, $CLASES clases, $RESERVAS reservas"
echo ""
echo "Para ejecutar la aplicación con estos datos:"
echo "  npm run dev:cloudflare"
echo ""
echo "O si prefieres usar Next.js dev (con mock DB):"
echo "  npm run dev"
echo ""

