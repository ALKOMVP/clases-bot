#!/bin/bash

# Script para hacer backup de la base de datos D1 de Cloudflare
# Uso: ./scripts/backup-db.sh [--send-email]
# Si se pasa --send-email, enviará el backup por email

set -e

DB_NAME="clases-db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/clases-db-backup-${TIMESTAMP}.sql"
SEND_EMAIL=false

# Verificar si se debe enviar por email
if [[ "$1" == "--send-email" ]]; then
    SEND_EMAIL=true
fi

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

echo "🔄 Exportando base de datos ${DB_NAME}..."
echo "📁 Archivo de backup: ${BACKUP_FILE}"

# Exportar la base de datos remota
wrangler d1 export "${DB_NAME}" --remote --output "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup completado exitosamente!"
    echo "📄 Archivo guardado en: ${BACKUP_FILE}"
    
    # Mostrar tamaño del archivo
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "📊 Tamaño del backup: ${FILE_SIZE}"
    
    # Crear un enlace simbólico al último backup
    LATEST_BACKUP="${BACKUP_DIR}/clases-db-latest.sql"
    ln -sf "$(basename "${BACKUP_FILE}")" "${LATEST_BACKUP}"
    echo "🔗 Último backup disponible en: ${LATEST_BACKUP}"
    
    # Enviar por email si se solicitó
    if [ "$SEND_EMAIL" = true ]; then
        if command -v node &> /dev/null && [ -f "scripts/send-backup-email.js" ]; then
            echo "📧 Enviando backup por email..."
            export BACKUP_FILE="${BACKUP_FILE}"
            node scripts/send-backup-email.js
        else
            echo "⚠️  No se puede enviar por email: node no está disponible o el script no existe"
        fi
    fi
else
    echo "❌ Error al hacer backup"
    exit 1
fi

