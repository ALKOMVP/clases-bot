# 📊 Cómo Ver Logs en Cloudflare Pages

## Método 1: Dashboard de Cloudflare (Recomendado)

### Pasos:

1. **Accede al Dashboard:**
   - Ve a: https://dash.cloudflare.com
   - Inicia sesión con tu cuenta

2. **Navega a tu proyecto:**
   - Ve a **Workers & Pages** > **clases-bot**
   - O directamente: https://dash.cloudflare.com/pages

3. **Ve a la pestaña Deployments:**
   - Haz clic en la pestaña **"Deployments"** en el menú superior

4. **Selecciona el deployment más reciente:**
   - Busca el deployment con el estado más reciente (debería tener un ✅ verde si fue exitoso)
   - Haz clic en el deployment para ver los detalles

5. **Ver los logs:**
   - En la página de detalles del deployment, busca la sección **"Logs"** o **"View logs"**
   - Haz clic para ver los logs en tiempo real o históricos
   - Los logs mostrarán todos los `console.log`, `console.error`, etc. de tu aplicación

### Información que verás en los logs:

- Errores de JavaScript/TypeScript
- Mensajes de `console.log()` y `console.error()`
- Errores de base de datos
- Errores de redirección
- Información sobre el binding D1

## Método 2: Wrangler CLI (Terminal)

### Ver logs en tiempo real:

```bash
# Ver logs del deployment más reciente
npx wrangler pages deployment tail --project-name=clases-bot

# Ver logs de un deployment específico
npx wrangler pages deployment tail --project-name=clases-bot --deployment-id=<DEPLOYMENT_ID>
```

### Obtener el ID del deployment:

```bash
# Listar deployments recientes
npx wrangler pages deployment list --project-name=clases-bot
```

## Método 3: Real-time Logs en el Dashboard

1. Ve a **Workers & Pages** > **clases-bot**
2. Haz clic en **"Logs"** en el menú lateral (si está disponible)
3. Verás logs en tiempo real de todas las requests

## 🔍 Qué Buscar en los Logs

Cuando veas un error 500, busca en los logs:

1. **Errores de binding D1:**
   ```
   DB not available
   Database not available
   ```

2. **Errores de getRequestContext:**
   ```
   getRequestContext is being called at the top level
   ```

3. **Errores de base de datos:**
   ```
   Error fetching usuarios
   Error fetching clases
   Error fetching reservas
   ```

4. **Errores de importación:**
   ```
   Cannot find module
   Module not found
   ```

5. **Errores de runtime:**
   ```
   Runtime Error
   Edge runtime error
   ```

## 📝 Logs Mejorados en el Código

He agregado logging detallado en todas las rutas API que incluye:
- Mensajes de error específicos
- Stack traces
- Información sobre el contexto de Cloudflare
- Estado del binding D1

Estos logs aparecerán en el dashboard de Cloudflare cuando ocurra un error.

## 🚨 Si No Ves Logs

Si no ves logs en el dashboard:

1. **Verifica que el deployment esté activo:**
   - El deployment debe estar marcado como "Success" (✅ verde)

2. **Espera unos minutos:**
   - Los logs pueden tardar 1-2 minutos en aparecer después de un deployment

3. **Haz una request a tu aplicación:**
   - Los logs solo aparecen cuando hay actividad
   - Intenta acceder a `https://clases-bot.pages.dev` para generar logs

4. **Verifica los permisos:**
   - Asegúrate de tener permisos para ver logs en tu cuenta de Cloudflare

## 🔗 Enlaces Útiles

- Dashboard de Cloudflare: https://dash.cloudflare.com
- Documentación de Logs: https://developers.cloudflare.com/pages/platform/functions/logs/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/

