#!/bin/bash

# Script para hacer backup y enviarlo por email inmediatamente
# Uso: ./scripts/backup-and-email.sh

set -e

echo "📦 Iniciando backup y envío por email..."

# Verificar que las variables de entorno estén configuradas
if [ -z "$EMAIL_FROM" ] || [ -z "$EMAIL_PASSWORD" ]; then
    echo "❌ Error: Faltan variables de entorno"
    echo ""
    echo "Por favor, configura las siguientes variables:"
    echo ""
    echo "export EMAIL_FROM='tucorreo@gmail.com'"
    echo "export EMAIL_PASSWORD='tu-contraseña-de-aplicacion-gmail'"
    echo ""
    echo "Luego ejecuta:"
    echo "  ./scripts/backup-and-email.sh"
    echo ""
    echo "📝 Cómo obtener la contraseña de aplicación de Gmail:"
    echo "   1. Ve a: https://myaccount.google.com/apppasswords"
    echo "   2. Selecciona 'Correo' y 'Otro (nombre personalizado)'"
    echo "   3. Escribe 'Clases Bot' y genera la contraseña"
    echo "   4. Copia la contraseña de 16 caracteres"
    exit 1
fi

# Hacer el backup
echo "🔄 Haciendo backup de la base de datos..."
npm run db:backup

# Obtener el último archivo de backup
LATEST_BACKUP=$(ls -t backups/clases-db-backup-*.sql | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No se encontró el archivo de backup"
    exit 1
fi

echo "📄 Backup creado: $LATEST_BACKUP"

# Enviar por email
echo "📧 Enviando backup por email a solverive@gmail.com..."
export BACKUP_FILE="$LATEST_BACKUP"
export EMAIL_TO="solverive@gmail.com"

# Intentar con SendGrid primero, luego con Gmail
if [ -n "$SENDGRID_API_KEY" ]; then
    echo "📬 Usando SendGrid para enviar email..."
    node scripts/send-backup-email-sendgrid.js
elif [ -n "$EMAIL_FROM" ] && [ -n "$EMAIL_PASSWORD" ]; then
    echo "📬 Usando Gmail SMTP para enviar email..."
    node scripts/send-backup-email.js
else
    echo "⚠️  No se puede enviar por email: faltan credenciales"
    echo "   Configura SENDGRID_API_KEY o EMAIL_FROM/EMAIL_PASSWORD"
    exit 1
fi

echo "✅ ¡Backup enviado exitosamente a solverive@gmail.com!"

