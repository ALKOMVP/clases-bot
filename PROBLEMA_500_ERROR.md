# 🔴 Problema: Error 500 en Cloudflare Pages

## Estado Actual

- ✅ Build local funciona correctamente
- ✅ Build de Cloudflare Pages se completa sin errores
- ❌ Todas las rutas API devuelven **500 Internal Server Error** en producción
- ❌ Incluso la ruta más simple (`/api/test`) falla con 500

## Análisis del Problema

El código generado por `@cloudflare/next-on-pages` intenta importar `node:async_hooks`:

```javascript
const __ALSes_PROMISE__ = import('node:async_hooks').then(({ AsyncLocalStorage }) => {
  // ...
}).catch(() => null);
```

Si este import falla, el código devuelve un **503** con un mensaje sobre `nodejs_compat`. Sin embargo, estamos recibiendo un **500**, lo que indica que:

1. El import de `async_hooks` **sí funciona** (porque no recibimos 503)
2. El error ocurre **después** de que `async_hooks` se importa correctamente
3. El problema está en la ejecución del código generado, no en la configuración de `nodejs_compat`

## Posibles Causas

1. **Incompatibilidad entre Next.js 15 y @cloudflare/next-on-pages 1.13.16**
   - Next.js 15 es muy reciente y puede tener problemas de compatibilidad
   - `@cloudflare/next-on-pages` puede no estar completamente compatible con Next.js 15

2. **Problema con el código generado**
   - El código generado puede estar usando APIs de Node.js que no están disponibles en el edge runtime
   - Incluso con `nodejs_compat`, algunas APIs pueden no funcionar correctamente

3. **Problema de configuración en Cloudflare Pages**
   - El flag `nodejs_compat` puede no estar aplicándose correctamente
   - Puede haber un problema con cómo Cloudflare Pages está ejecutando el código

## Soluciones a Probar

### Solución 1: Downgrade a Next.js 14

```bash
npm install next@14.2.18 --save
npm install --legacy-peer-deps
npm run build:cloudflare
npx wrangler pages deploy .vercel/output/static --project-name=clases-bot
```

**Problema**: `@cloudflare/next-on-pages@1.13.16` requiere Next.js >= 14.3.0, pero Next.js 14.2.18 es la última versión estable de la serie 14.2.

### Solución 2: Usar OpenNext (Recomendado por @cloudflare/next-on-pages)

El paquete `@cloudflare/next-on-pages` está deprecated y recomienda usar OpenNext:

```bash
npm install @opennextjs/cloudflare --save-dev
```

**Nota**: Esto requiere cambios significativos en la configuración del proyecto.

### Solución 3: Verificar configuración en Cloudflare Dashboard

1. Ve a: https://dash.cloudflare.com
2. **Workers & Pages** > **clases-bot**
3. **Settings** > **Functions**
4. Verifica que:
   - ✅ `nodejs_compat` esté en **Compatibility Flags**
   - ✅ El binding D1 esté configurado (Variable: `DB`, Database: `clases-db`)
5. **Settings** > **Builds & deployments**
6. Verifica que el build command sea: `npm ci && npm run build:cloudflare`
7. Verifica que el output directory sea: `.vercel/output/static`

### Solución 4: Probar con una versión anterior de @cloudflare/next-on-pages

```bash
npm install @cloudflare/next-on-pages@1.12.0 --save-dev
npm run build:cloudflare
npx wrangler pages deploy .vercel/output/static --project-name=clases-bot
```

**Problema**: La versión 1.12.0 también intenta importar `async_hooks`.

### Solución 5: Migrar a Cloudflare Workers (no Pages)

Si el problema persiste, considera usar Cloudflare Workers en lugar de Pages:

```bash
npx wrangler deploy
```

**Nota**: Esto requiere cambios en la configuración del proyecto.

## Próximos Pasos

1. **Verificar logs en tiempo real**:
   ```bash
   npx wrangler pages deployment tail --project-name=clases-bot
   ```
   Luego hacer una request a `/api/test` y ver qué error aparece.

2. **Probar con Next.js 14.2.18** (con `--legacy-peer-deps`)

3. **Considerar migrar a OpenNext** si el problema persiste

4. **Contactar soporte de Cloudflare** si ninguna solución funciona

## Referencias

- [@cloudflare/next-on-pages deprecation notice](https://github.com/cloudflare/next-on-pages)
- [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)
- [Cloudflare Pages compatibility flags](https://developers.cloudflare.com/pages/platform/functions/#compatibility-flags)






