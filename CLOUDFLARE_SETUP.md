# Configuración de Cloudflare Pages

## ⚠️ IMPORTANTE: Diferencia entre Workers y Pages

**Tu proyecto debe estar en Cloudflare Pages, NO en Workers:**
- ✅ **Pages**: URLs como `clases-bot.pages.dev` o `*.pages.dev`
- ❌ **Workers**: URLs como `clases-bot.workers.dev` (esto es incorrecto para este proyecto)

Si ves URLs con `.workers.dev`, estás en la sección incorrecta.

## ⚠️ Si tu proyecto está como Worker, créalo como Page

**Si ves URLs con `.workers.dev`, tu proyecto está como Worker. Necesitas crearlo como Page:**

### Pasos para crear el proyecto como Page:

1. **Ve a la sección de Pages:**
   - Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
   - En el menú lateral, busca **"Pages"** (NO "Workers & Pages")
   - O usa este enlace directo: https://dash.cloudflare.com/pages

2. **Crea un nuevo proyecto:**
   - Click en **"Create a project"** (botón azul)
   - Selecciona **"Connect to Git"**
   - Selecciona **GitHub** y autoriza el acceso si es necesario
   - Selecciona el repositorio: `ALKOMVP/clases-bot`

3. **Configura el build:**
   - **Project name**: `clases-bot` (o el nombre que prefieras)
   - **Production branch**: `main` (o `master` si es tu rama principal)
   - **Framework preset**: **None** (NO uses Next.js preset)
   - **Build command**: `npm ci && npm run build:cloudflare`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: (dejar vacío)
   - **Node.js version**: 20.x (o la más reciente disponible)
   - **Deploy command**: `echo "Deploy completed"` (si el campo es requerido)
     - ⚠️ **IMPORTANTE**: NO uses `npx wrangler deploy` - ese es para Workers

4. **Environment variables**: No necesitas agregar nada aquí

5. **Click en "Save and Deploy"**

6. **Después del primer deploy, configura:**
   - Ve a **Settings** > **Functions**
   - Agrega el binding D1: Variable `DB`, Database `clases-db`
   - Agrega el compatibility flag `nodejs_compat`

**Nota:** Puedes tener el proyecto como Worker Y como Page al mismo tiempo. El proyecto de Worker no afectará al de Page.

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

## Solución para "No URLs enabled"

Si ves "No URLs enabled" después del build:

1. **Espera a que el build termine**: Si ves "Build in progress", espera a que termine (puede tardar 2-5 minutos)

2. **Verifica el Build Output Directory**:
   - Ve a **Settings** > **Builds & deployments**
   - Asegúrate de que **"Build output directory"** sea exactamente: `.vercel/output/static`
   - Guarda los cambios

3. **Verifica el deployment**:
   - Ve a la pestaña **"Deployments"**
   - Busca el deployment más reciente
   - Debe estar marcado como **"Success"** (✅ verde)
   - Si hay errores, revisa los logs del build

4. **Si el build falla o no genera URLs**:
   - Verifica que el build command sea: `npm ci && npm run build:cloudflare`
   - Verifica que el output directory sea: `.vercel/output/static`
   - Revisa los logs del build para ver errores específicos

5. **Después de un build exitoso**:
   - Las URLs aparecerán automáticamente en la pestaña **"Deployments"**
   - Cada deployment tiene su propia URL de preview
   - La URL de producción será `https://clases-bot.pages.dev` (si está configurada)

## Notas

- El flag `nodejs_compat` es necesario para que Next.js funcione correctamente en Cloudflare Pages
- El binding de D1 es necesario para que las rutas API puedan acceder a la base de datos
- Sin estos dos pasos, verás errores como "Node.JS Compatibility Error" o "405 Method Not Allowed"
- "No URLs enabled" generalmente significa que el build aún está en progreso o que el deployment no se completó correctamente

