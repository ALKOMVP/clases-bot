# Métodos para Recuperar Código de Producción

## 🎯 Método 1: Browser DevTools (MÁS EFECTIVO)

### Pasos:
1. Abre en Chrome/Firefox: `https://7324963f.clases-bot.pages.dev`
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Sources** (o **Network**)
4. En Sources, navega a:
   - `7324963f.clases-bot.pages.dev` > `_next` > `static` > `chunks` > `app`
   - Busca: `cancelaciones/page.js`
   - Busca: `calendario/page.js`
   - Busca: `components/Navbar.js` o similar
5. Click derecho en el archivo > **Save as...** o copia el código
6. Si está minificado, usa: https://beautifier.io/ para desminificarlo

### Ventajas:
- ✅ Acceso directo al código compilado
- ✅ Puedes ver el código desminificado en el browser
- ✅ No requiere autenticación

---

## 🔧 Método 2: Network Tab del Browser

### Pasos:
1. Abre `https://7324963f.clases-bot.pages.dev`
2. `F12` > **Network** tab
3. Recarga la página (`Ctrl+R` o `Cmd+R`)
4. Filtra por tipo: `JS`
5. Busca archivos que contengan:
   - `cancelacion`
   - `calendario`
   - `Navbar`
   - `components`
6. Click en cada archivo > **Response** tab
7. Copia el código

---

## 📋 Método 3: Cloudflare Dashboard (Manual)

### URL:
```
https://dash.cloudflare.com/73222d0ff301aa06195455f0a0532f95/pages/view/clases-bot/7324963f-8530-478e-beb8-b50a9088c5e4
```

### Pasos:
1. Accede al dashboard con tu cuenta
2. Ve a la sección **"Assets uploaded"**
3. Expande los directorios:
   - `server-functions/default/.next/server/app/`
   - Busca: `cancelaciones/route.js` o `.ts`
   - Busca: `calendario/page.js` o `.ts`
4. Click en cada archivo para ver el código
5. Copia y pega el código

### Nota:
Los archivos en el dashboard pueden estar compilados (.js), pero aún así puedes ver la estructura.

---

## 🔑 Método 4: API de Cloudflare con Token

### Requisitos:
- Token de API de Cloudflare con permisos:
  - `Account:Read`
  - `Cloudflare Pages:Read` o `Edit`

### Comandos:
```bash
# Obtener detalles del deployment
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/73222d0ff301aa06195455f0a0532f95/pages/projects/clases-bot/deployments/7324963f-8530-478e-beb8-b50a9088c5e4" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json"

# Listar todos los deployments
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/73222d0ff301aa06195455f0a0532f95/pages/projects/clases-bot/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### Crear Token:
1. Ve a: https://dash.cloudflare.com/profile/api-tokens
2. "Create Token" > "Custom Token"
3. Permisos:
   - Account → Account → Read
   - Account → Cloudflare Pages → Read
4. Guarda el token en `.dev.vars`:
   ```
   CLOUDFLARE_API_TOKEN=tu_token_aqui
   ```

---

## 📥 Método 5: Descargar Assets con Scripts

### Script 1: Descargar todos los chunks
```bash
#!/bin/bash
DEPLOY_URL="https://7324963f.clases-bot.pages.dev"
OUTPUT_DIR="recovered-assets"

mkdir -p "$OUTPUT_DIR"

# Descargar página principal
curl -s "$DEPLOY_URL" -o "$OUTPUT_DIR/index.html"

# Extraer todas las referencias JS
grep -o 'src="[^"]*\.js"' "$OUTPUT_DIR/index.html" | \
  sed 's/src="//;s/"//' | \
  while read js_file; do
    echo "Descargando: $js_file"
    curl -s "$DEPLOY_URL$js_file" -o "$OUTPUT_DIR/$(basename $js_file)" || true
  done

echo "Archivos descargados en: $OUTPUT_DIR/"
```

### Script 2: Buscar source maps
```bash
# Los source maps pueden tener el código original
curl -s "https://7324963f.clases-bot.pages.dev/_next/static/chunks/" | \
  grep -o 'href="[^"]*\.map"' | \
  while read map_file; do
    filename=$(echo $map_file | sed 's/href="//;s/"//')
    curl -s "https://7324963f.clases-bot.pages.dev/_next/static/chunks/$filename" \
      -o "recovered-assets/$filename"
  done
```

---

## 🛠️ Método 6: Herramientas de Descompilación

### Para JavaScript Minificado:
1. **JS Beautifier**: https://beautifier.io/
   - Pega el código minificado
   - Click "Beautify"
   - Copia el resultado

2. **Source Map Explorer**: 
   - Si hay source maps, pueden contener el código original
   - Busca archivos `.map` en el deploy

3. **Browser DevTools Pretty Print**:
   - En Sources tab, click en `{}` (Pretty print)
   - Convierte código minificado a legible

---

## 🔍 Método 7: Inspeccionar Código en Runtime

### En el Browser:
1. Abre la página de cancelaciones: `https://7324963f.clases-bot.pages.dev/cancelaciones`
2. `F12` > **Console** tab
3. Ejecuta:
   ```javascript
   // Ver componentes React montados
   window.__NEXT_DATA__
   
   // Ver rutas disponibles
   window.__NEXT_DATA__.page
   ```

4. En **Elements** tab, inspecciona el HTML renderizado para entender la estructura

---

## 📦 Método 8: Usar Wrangler para Logs

```bash
# Ver logs del deployment (puede tener información útil)
wrangler pages deployment tail 7324963f-8530-478e-beb8-b50a9088c5e4 \
  --project-name=clases-bot

# Ver información del proyecto
wrangler pages project list
```

---

## 🎨 Método 9: Reconstrucción Basada en Funcionalidad

Ya realizado:
- ✅ Navbar con enlace Cancelaciones
- ✅ Página `/cancelaciones` completa
- ✅ Modal calendario con Alumnos Temporales y Fijos
- ✅ API actualizada

---

## ⚡ Método 10: Comparar con Deploy Actual

```bash
# Ver diferencias entre deploys
wrangler pages deployment list --project-name=clases-bot --json | \
  jq '.[] | select(.Id | contains("7324963f"))'

# Comparar con deploy más reciente
# Ver qué cambió entre deployments
```

---

## 🏆 RECOMENDACIÓN FINAL

**El método más efectivo es el Método 1 (Browser DevTools)** porque:
- No requiere autenticación
- Acceso directo al código
- Puedes ver el código desminificado
- Puedes copiar fácilmente

**Pasos rápidos:**
1. Abre: https://7324963f.clases-bot.pages.dev
2. F12 > Sources
3. Busca archivos en `_next/static/chunks/app/`
4. Copia el código que necesites

---

## 📝 Nota Importante

Los archivos en producción están **compilados y minificados**, por lo que:
- No tendrás el código TypeScript original
- El código estará en JavaScript
- Puede estar ofuscado/minificado
- Necesitarás desminificarlo con herramientas

El código que ya recreé está basado en la funcionalidad visible y debería funcionar igual que en producción.

