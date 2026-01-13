# 🚀 Deploy a Proyecto de Staging

Esta guía te ayudará a crear y desplegar el proyecto en un nuevo proyecto de Cloudflare Pages sin afectar producción.

## 📋 Paso 1: Crear el Nuevo Proyecto en Cloudflare Pages

### Opción A: Desde la Terminal (Recomendado - Más Rápido)

Crea el proyecto directamente desde la terminal:

```bash
npx wrangler pages project create clases-bot-staging --production-branch=main
```

Esto creará el proyecto `clases-bot-staging` en Cloudflare Pages.

### Opción B: Desde el Dashboard

Si prefieres crearlo manualmente:

1. **Ve a Cloudflare Pages:**
   - Accede a: https://dash.cloudflare.com/pages
   - O desde el dashboard: menú lateral > **"Pages"**

2. **Crea un nuevo proyecto:**
   - Click en **"Create a project"** (botón azul)
   - Selecciona **"Upload assets"** (para deploy manual)
   - **Project name**: `clases-bot-staging` (o el nombre que prefieras)
   - Click en **"Create project"**

   ⚠️ **NOTA**: No necesitas configurar Git para este método, haremos deploy manual.

## 📋 Paso 2: Configurar el Proyecto en Cloudflare Dashboard

Después de crear el proyecto (o después del primer deploy), necesitas configurar:

### 1. Configurar D1 Database Binding

1. Ve a tu proyecto en Cloudflare Pages: **clases-bot-staging**
2. Click en **Settings** > **Functions**
3. En la sección **"D1 database bindings"**:
   - Click en **"Add binding"**
   - **Variable name**: `DB` (exactamente así, en MAYÚSCULAS)
   - **D1 database**: Selecciona `clases-db` o ingresa el ID: `5ebf2f88-4c0c-4766-85ef-2c5b65ed87e2`
   - ⚠️ **IMPORTANTE**: Puedes usar la misma base de datos que producción o crear una nueva para staging
4. Click en **Save**

### 2. Configurar Compatibility Flags

En la misma página (Settings > Functions):

1. En la sección **"Compatibility Flags"**:
   - Agrega: `nodejs_compat`
   - Asegúrate de que esté habilitado para:
     - ✅ **Production**
     - ✅ **Preview**
2. Click en **Save**

### 3. Configurar Variables de Entorno (Opcional)

Si necesitas variables de entorno diferentes para staging:

1. Ve a **Settings** > **Environment variables**
2. Agrega las variables necesarias (ej: `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, etc.)
3. Puedes configurarlas para **Production**, **Preview**, o ambas

## 📋 Paso 3: Hacer el Deploy

Ejecuta el script de deploy a staging:

```bash
npm run deploy:staging
```

Este comando:
1. ✅ Construye el proyecto con OpenNext
2. ✅ Prepara los archivos para Cloudflare
3. ✅ Despliega a `clases-bot-staging`

## 📋 Paso 4: Verificar el Deploy

1. Ve a Cloudflare Dashboard > Pages > **clases-bot-staging**
2. Click en la pestaña **"Deployments"**
3. Busca el deployment más reciente (debería tener un ✅ verde)
4. Click en el deployment para ver la URL
5. La URL será algo como: `https://clases-bot-staging.pages.dev`

## 🔄 Usar una Base de Datos Diferente para Staging (Opcional)

Si quieres una base de datos separada para staging:

### Crear Nueva Base de Datos D1:

```bash
wrangler d1 create clases-db-staging
```

Esto te dará un output con el `database_id`. Luego:

1. Actualiza el binding D1 en el proyecto de staging con el nuevo `database_id`
2. Ejecuta las migraciones en la nueva base de datos:
   ```bash
   wrangler d1 migrations apply clases-db-staging --remote
   ```

## 📝 Resumen de Comandos

```bash
# Deploy a staging
npm run deploy:staging

# Deploy a producción (original)
npm run deploy:cloudflare
```

## ⚠️ Notas Importantes

- ✅ El proyecto de staging es completamente independiente de producción
- ✅ Puedes tener ambos proyectos activos al mismo tiempo
- ✅ Los cambios en staging NO afectan producción
- ⚠️ Si usas la misma base de datos D1, los datos se compartirán entre staging y producción
- 💡 Recomendación: Usa una base de datos separada para staging si vas a hacer pruebas con datos

## 🔗 URLs

- **Producción**: `https://clases-bot.pages.dev`
- **Staging**: `https://clases-bot-staging.pages.dev`
