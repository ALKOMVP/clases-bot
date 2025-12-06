# Configuración de Cloudflare Pages

## ⚠️ IMPORTANTE: Diferencia entre Workers y Pages

**Tu proyecto debe estar en Cloudflare Pages, NO en Workers:**
- ✅ **Pages**: URLs como `clases-bot.pages.dev` o `*.pages.dev`
- ❌ **Workers**: URLs como `clases-bot.workers.dev` (esto es incorrecto para este proyecto)

Si ves URLs con `.workers.dev`, estás en la sección incorrecta.

## Opción Recomendada: Conectar desde GitHub

La forma más fácil de configurar todo automáticamente es conectar el proyecto desde GitHub:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) > **Pages** (NO Workers & Pages)
2. Click en **"Create a project"** > **"Connect to Git"**
3. Selecciona **GitHub** y autoriza el acceso
4. Selecciona el repositorio: `ALKOMVP/clases-bot`
5. Configura el build:
   - **Framework preset**: None (no usar Next.js preset)
   - **Build command**: `npm ci && npm run build:cloudflare`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/` (dejar vacío)
   - **Node.js version**: 20.x (o la más reciente disponible)
   - **Deploy command**: (DEJAR VACÍO si es posible, o usar `echo "Deploy completed"` si el campo es requerido)
     - ⚠️ **IMPORTANTE**: NO uses `npx wrangler deploy` - ese es para Workers, no para Pages
     - Cloudflare Pages despliega automáticamente después del build, no necesita un comando de deploy
6. En **"Environment variables"**: No necesitas agregar nada
7. Click en **"Save and Deploy"**

Cloudflare leerá automáticamente el `wrangler.toml` y configurará:
- ✅ Compatibility flags (`nodejs_compat`)
- ✅ D1 database bindings

## Opción Manual: Configurar en el Dashboard

Si prefieres configurar manualmente:

### 1. Configurar Compatibility Flags

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) > **Pages** > **clases-bot**
2. Click en **Settings** > **Functions**
3. En la sección **"Compatibility Flags"**:
   - Si hay un campo de texto (no solo dropdown), escribe manualmente: `nodejs_compat`
   - Si solo hay dropdown, busca la opción que diga "nodejs" o similar
   - Agrega para **Production** y **Preview**
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

Después de un build exitoso, Cloudflare Pages genera automáticamente URLs:

1. **URL de producción principal**: `https://clases-bot.pages.dev` (si está configurado)
2. **URL de preview**: Cada deployment tiene su propia URL única
   - Formato: `https://<deployment-hash>.clases-bot.pages.dev`
   - Ejemplo: `https://bcb59d10.clases-bot.pages.dev`

**Para encontrar tu URL:**
1. Ve a Cloudflare Dashboard > Pages > `clases-bot`
2. Click en la pestaña **"Deployments"**
3. Busca el deployment más reciente (debería tener un ✅ verde)
4. Click en el deployment para ver los detalles
5. Ahí verás la URL de preview y la URL de producción (si está configurada)

## Notas

- El flag `nodejs_compat` es necesario para que Next.js funcione correctamente en Cloudflare Pages
- El binding de D1 es necesario para que las rutas API puedan acceder a la base de datos
- Sin estos dos pasos, verás errores como "Node.JS Compatibility Error" o "405 Method Not Allowed"

