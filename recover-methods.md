# Métodos para Recuperar Código de Producción

## Método 1: Descargar Assets del Deploy con curl
```bash
# Descargar todos los chunks de JavaScript
curl -s "https://7324963f.clases-bot.pages.dev/_next/static/chunks/" | grep -o 'href="[^"]*\.js"' | while read url; do
  filename=$(echo $url | sed 's/href="//;s/"//')
  curl -s "https://7324963f.clases-bot.pages.dev/_next/static/chunks/$filename" -o "recover-deploy/$filename"
done
```

## Método 2: Usar Browser DevTools
1. Abrir https://7324963f.clases-bot.pages.dev en Chrome/Firefox
2. F12 > Sources/Network tab
3. Buscar archivos .js en _next/static/chunks/
4. Copiar código de los archivos relevantes

## Método 3: API de Cloudflare con Token
```bash
# Necesitas CLOUDFLARE_API_TOKEN
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/clases-bot/deployments/7324963f-8530-478e-beb8-b50a9088c5e4" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

## Método 4: Wrangler Pages Functions
```bash
# Ver funciones desplegadas
wrangler pages functions list --project-name=clases-bot
```

## Método 5: Extraer de JavaScript Minificado
Usar herramientas como:
- https://beautifier.io/ (para desminificar JS)
- https://sourcemaps.info/ (si hay source maps)

## Método 6: Dashboard de Cloudflare
Acceder a: https://dash.cloudflare.com/.../pages/view/clases-bot/7324963f-8530-478e-beb8-b50a9088c5e4
Y copiar código manualmente desde "Assets uploaded"
