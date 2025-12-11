# 📧 Configurar Backups Semanales por Email

## ✅ Sistema de Backups Automáticos

El sistema está configurado para:
- ✅ Hacer backups semanales automáticamente (todos los domingos a las 2 AM UTC / 11 PM del sábado en Buenos Aires)
- ✅ Enviar el backup por email a `solverive@gmail.com`
- ✅ Guardar el backup como artifact en GitHub (disponible por 7 días)

## 🔧 Configuración Requerida

Para que funcione, necesitas configurar los siguientes **Secrets en GitHub**:

### 1. Ir a GitHub Secrets

1. Ve a tu repositorio en GitHub: `https://github.com/ALKOMVP/clases-bot`
2. Ve a **Settings** > **Secrets and variables** > **Actions**
3. Haz clic en **New repository secret**

### 2. Agregar los siguientes Secrets:

#### `CLOUDFLARE_API_TOKEN`
- **Valor**: Tu API token de Cloudflare
- **Cómo obtenerlo**:
  1. Ve a https://dash.cloudflare.com/profile/api-tokens
  2. Haz clic en "Create Token"
  3. Usa el template "Edit Cloudflare Workers" o crea uno personalizado con permisos para D1
  4. Copia el token generado

#### `EMAIL_FROM`
- **Valor**: Tu dirección de email de Gmail (ej: `tucorreo@gmail.com`)
- Este será el email desde el que se envían los backups

#### `EMAIL_PASSWORD`
- **Valor**: Contraseña de aplicación de Gmail (NO tu contraseña normal)
- **Cómo obtenerla**:
  1. Ve a tu cuenta de Google: https://myaccount.google.com/
  2. Ve a **Seguridad** > **Verificación en 2 pasos** (debe estar activada)
  3. Ve a **Contraseñas de aplicaciones**
  4. Selecciona "Correo" y "Otro (nombre personalizado)"
  5. Escribe "Clases Bot Backup" y haz clic en "Generar"
  6. Copia la contraseña de 16 caracteres generada (esta es tu `EMAIL_PASSWORD`)

## 📅 Frecuencia de Backups

Los backups se ejecutan automáticamente:
- **Cada domingo a las 2:00 AM UTC** (11:00 PM del sábado en Buenos Aires)
- También puedes ejecutarlos manualmente desde GitHub Actions

## 🧪 Probar el Sistema

### Opción 1: Ejecutar manualmente desde GitHub

1. Ve a tu repositorio en GitHub
2. Haz clic en la pestaña **Actions**
3. Selecciona el workflow **"Backup Semanal de Base de Datos"**
4. Haz clic en **"Run workflow"** > **"Run workflow"**

### Opción 2: Probar localmente

```bash
# 1. Instalar nodemailer
npm install nodemailer

# 2. Configurar variables de entorno
export EMAIL_FROM="tucorreo@gmail.com"
export EMAIL_PASSWORD="tu-contraseña-de-aplicacion"
export EMAIL_TO="solverive@gmail.com"

# 3. Hacer backup y enviar por email
npm run db:backup:email
```

O manualmente:
```bash
# Hacer backup
npm run db:backup

# Enviar por email (configurar variables primero)
export BACKUP_FILE="backups/clases-db-backup-YYYYMMDD_HHMMSS.sql"
node scripts/send-backup-email.js
```

## 📧 Formato del Email

El email recibido incluirá:
- **Asunto**: `📦 Backup Semanal - Clases Bot - [fecha]`
- **Contenido**: Información del backup (archivo, tamaño, fecha)
- **Adjunto**: El archivo SQL del backup

## 🔍 Verificar que Funciona

1. Espera al próximo domingo (o ejecuta manualmente)
2. Revisa tu email `solverive@gmail.com`
3. Deberías recibir un email con el backup adjunto
4. También puedes verificar en GitHub Actions que el workflow se ejecutó correctamente

## 🛠️ Solución de Problemas

### El email no llega

1. **Verificar que los Secrets están configurados correctamente**:
   - Ve a Settings > Secrets and variables > Actions
   - Verifica que `EMAIL_FROM`, `EMAIL_PASSWORD` y `CLOUDFLARE_API_TOKEN` existen

2. **Verificar la contraseña de aplicación**:
   - Asegúrate de usar una "Contraseña de aplicación" de Gmail, NO tu contraseña normal
   - La contraseña de aplicación tiene 16 caracteres sin espacios

3. **Verificar logs de GitHub Actions**:
   - Ve a Actions > [último workflow ejecutado]
   - Revisa los logs para ver errores específicos

### El backup falla

1. **Verificar el API token de Cloudflare**:
   - Asegúrate de que el token tenga permisos para D1
   - Puedes regenerarlo si es necesario

2. **Verificar que la base de datos existe**:
   ```bash
   wrangler d1 list
   ```

## 📝 Notas Importantes

- ⚠️ **No compartas tus Secrets**: Nunca subas las contraseñas al repositorio
- ✅ **Los backups se guardan localmente**: También se guardan en `backups/` (no se suben a git)
- ✅ **Los backups se guardan en GitHub**: Como artifacts por 7 días
- ✅ **Los backups se envían por email**: A `solverive@gmail.com` automáticamente

## 🔗 Enlaces Útiles

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)





