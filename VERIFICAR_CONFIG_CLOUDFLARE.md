# Verificar Configuración de Cloudflare Pages

## ⚠️ PROBLEMA IDENTIFICADO

Incluso la ruta API más simple posible (`/api/test`) está dando error 500. Esto indica un problema de **configuración en Cloudflare Pages**, no en el código.

## ✅ Pasos para Verificar y Corregir

### 1. Verificar Compatibility Flags

1. Ve a: https://dash.cloudflare.com
2. **Workers & Pages** > **clases-bot**
3. **Settings** > **Functions**
4. Verifica que en **"Compatibility Flags"** esté:
   - ✅ `nodejs_compat` habilitado

Si no está habilitado:
- Haz clic en **"Add compatibility flag"**
- Selecciona `nodejs_compat`
- Guarda los cambios
- Espera 1-2 minutos y prueba de nuevo

### 2. Verificar D1 Binding (aunque no se use en la ruta de test)

1. En la misma página (**Settings** > **Functions**)
2. Verifica que el binding D1 esté configurado:
   - **Variable name**: `DB`
   - **D1 database**: `clases-db`

### 3. Verificar Logs de Cloudflare

1. Ve a **Deployments**
2. Selecciona el deployment más reciente
3. Haz clic en **"View logs"** o **"Logs"**
4. Recarga la página y haz clic en "Test API Route"
5. Busca errores que mencionen:
   - "nodejs_compat"
   - "Cannot access built-in Node.js modules"
   - "Disallowed operation"

### 4. Verificar Versión de @cloudflare/next-on-pages

El proyecto usa:
- `@cloudflare/next-on-pages@1.13.16`
- `next@15.4.8`

Si el problema persiste, puede ser un bug de compatibilidad. Considera:
- Actualizar a la última versión de `@cloudflare/next-on-pages`
- O downgrade a Next.js 14

## 🔍 Comando para Ver Logs en Tiempo Real

```bash
npx wrangler pages deployment tail --project-name=clases-bot
```

Luego recarga la página y haz clic en "Test API Route". Deberías ver los logs en tiempo real.

## 📝 Si Nada Funciona

Si después de verificar todo lo anterior el problema persiste:

1. **Crea un nuevo proyecto de Cloudflare Pages** desde cero
2. **Configura manualmente**:
   - Compatibility flag: `nodejs_compat`
   - D1 binding: `DB` -> `clases-db`
3. **Despliega de nuevo**

Esto descartará problemas de configuración heredados.

