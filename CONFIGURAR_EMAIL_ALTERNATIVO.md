# 📧 Configurar Email Alternativo (SendGrid)

Como las contraseñas de aplicación de Gmail no están disponibles para tu cuenta, puedes usar **SendGrid** que es más fácil de configurar y tiene un plan gratuito.

## 🚀 Opción 1: SendGrid (Recomendado - Más Fácil)

### 1. Crear cuenta en SendGrid

1. Ve a: https://signup.sendgrid.com/
2. Crea una cuenta gratuita (100 emails/día gratis)
3. Verifica tu email

### 2. Crear API Key

1. Ve a: https://app.sendgrid.com/settings/api_keys
2. Haz clic en "Create API Key"
3. Nombre: "Clases Bot Backup"
4. Permisos: "Full Access" o "Mail Send"
5. Copia la API Key generada (solo se muestra una vez)

### 3. Verificar email remitente

1. Ve a: https://app.sendgrid.com/settings/sender_auth/senders/new
2. Agrega tu email: `solverive@gmail.com`
3. Verifica el email (recibirás un código de verificación)

### 4. Usar el backup con SendGrid

```bash
export SENDGRID_API_KEY='tu-api-key-de-sendgrid'
export EMAIL_FROM='solverive@gmail.com'
npm run db:backup:now
```

## 🔄 Opción 2: Usar Gmail con OAuth2 (Más Complejo)

Si prefieres seguir usando Gmail, necesitarías configurar OAuth2, que es más complejo. SendGrid es más simple.

## 📝 Configurar en GitHub Actions

Para los backups automáticos semanales, agrega este Secret en GitHub:

1. Ve a: `https://github.com/ALKOMVP/clases-bot/settings/secrets/actions`
2. Agrega: `SENDGRID_API_KEY` con tu API Key de SendGrid
3. Agrega: `EMAIL_FROM` con `solverive@gmail.com`

El workflow ya está configurado para usar SendGrid si está disponible.

## ✅ Ventajas de SendGrid

- ✅ No requiere contraseñas de aplicación
- ✅ Más fácil de configurar
- ✅ 100 emails/día gratis
- ✅ Más confiable para automatización
- ✅ No depende de configuración de Gmail





