# 🔧 Configurar D1 Database Binding en Cloudflare Pages

## ⚠️ IMPORTANTE: Este paso es OBLIGATORIO

Sin el binding D1 configurado, verás errores **500 Internal Server Error** en todas las rutas API.

## 📋 Pasos para Configurar el Binding D1

### Paso 1: Acceder al Dashboard de Cloudflare

1. Ve a: https://dash.cloudflare.com
2. Inicia sesión con tu cuenta de Cloudflare
3. En el menú lateral izquierdo, busca y haz clic en **"Workers & Pages"**
4. Busca tu proyecto **"clases-bot"** y haz clic en él

### Paso 2: Ir a Settings > Functions

1. En la página del proyecto, haz clic en la pestaña **"Settings"** (Configuración)
2. En el menú lateral de Settings, busca y haz clic en **"Functions"**

### Paso 3: Configurar D1 Database Binding

1. Desplázate hacia abajo hasta la sección **"D1 database bindings"**
2. Haz clic en el botón **"Add binding"** (Agregar binding)
3. Completa el formulario:
   - **Variable name**: `DB` (exactamente así, en MAYÚSCULAS)
   - **D1 database**: 
     - Si ves un dropdown, selecciona **"clases-db"**
     - Si no hay dropdown, ingresa el ID: `5ebf2f88-4c0c-4766-85ef-2c5b65ed87e2`
4. Haz clic en **"Save"** (Guardar)

### Paso 4: Configurar Compatibility Flag (si no está configurado)

En la misma página (Settings > Functions):

1. Busca la sección **"Compatibility Flags"**
2. Haz clic en **"Add compatibility flag"** o edita los existentes
3. Agrega: `nodejs_compat`
4. Asegúrate de que esté habilitado para:
   - ✅ **Production**
   - ✅ **Preview**
5. Haz clic en **"Save"**

### Paso 5: Esperar el Redeploy

1. Después de guardar, Cloudflare **automáticamente** hará un redeploy
2. Espera 1-2 minutos
3. Ve a la pestaña **"Deployments"** para ver el progreso
4. Cuando el deployment esté completo (✅ verde), prueba tu aplicación

## ✅ Verificar que Funciona

1. Ve a tu URL de Cloudflare Pages (ej: `https://clases-bot.pages.dev`)
2. Deberías ver la página de login (no un error 500)
3. Inicia sesión con:
   - Usuario: `yoga`
   - Contraseña: `yoga`
4. Si puedes navegar por la aplicación sin errores 500, ¡está configurado correctamente!

## 🐛 Si Sigue Fallando

### Verificar los Logs

1. Ve a **Deployments** > [tu deployment más reciente]
2. Haz clic en **"View logs"** o **"Logs"**
3. Busca mensajes de error que mencionen:
   - "DB not available"
   - "Database not available"
   - "Cannot read property 'prepare' of undefined"

### Verificar que el Binding Está Configurado

1. Ve a **Settings** > **Functions**
2. Verifica que en **"D1 database bindings"** aparezca:
   - Variable: `DB`
   - Database: `clases-db` o el ID correcto

### Verificar que la Base de Datos Existe

1. Ve a **Workers & Pages** > **D1** (en el menú lateral)
2. Verifica que exista la base de datos **"clases-db"**
3. Si no existe, créala con:
   ```bash
   wrangler d1 create clases-db
   ```
4. Luego ejecuta las migraciones:
   ```bash
   npm run db:migrate:remote
   ```

## 📝 Notas Importantes

- El binding **DEBE** llamarse exactamente `DB` (mayúsculas)
- El binding debe estar configurado para **Production** y **Preview**
- Después de configurar el binding, Cloudflare hace un redeploy automático
- Si cambias el binding, espera a que termine el redeploy antes de probar

## 🔗 Enlaces Útiles

- Dashboard de Cloudflare: https://dash.cloudflare.com
- Documentación de D1: https://developers.cloudflare.com/d1/
- Documentación de Pages: https://developers.cloudflare.com/pages/

