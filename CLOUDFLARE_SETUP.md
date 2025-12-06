# Configuración de Cloudflare Pages

## Pasos Requeridos en el Dashboard

### 1. Configurar Compatibility Flags

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) > **Pages** > **clases-bot**
2. Click en **Settings** > **Functions**
3. En la sección **"Compatibility Flags"**:
   - Agrega `nodejs_compat` para **Production**
   - Agrega `nodejs_compat` para **Preview**
4. Click en **Save**

### 2. Configurar D1 Database Binding

En la misma página (Settings > Functions):

1. En la sección **"D1 database bindings"**:
   - Click en **"Add binding"**
   - **Variable name**: `DB`
   - **D1 database**: Selecciona `clases-db` o ingresa el ID: `5ebf2f88-4c0c-4766-85ef-2c5b65ed87e2`
2. Click en **Save**

### 3. Verificar

Después de guardar, Cloudflare redeployará automáticamente. Espera unos minutos y verifica que la aplicación funcione correctamente.

## URL de Producción

- **URL actual**: https://clases-bot.pages.dev
- **Deploy específico**: https://bcb59d10.clases-bot.pages.dev

## Notas

- El flag `nodejs_compat` es necesario para que Next.js funcione correctamente en Cloudflare Pages
- El binding de D1 es necesario para que las rutas API puedan acceder a la base de datos
- Sin estos dos pasos, verás errores como "Node.JS Compatibility Error" o "405 Method Not Allowed"

