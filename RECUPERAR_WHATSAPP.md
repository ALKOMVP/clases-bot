# Guía para Recuperar el Código del Bot de WhatsApp

## Método 1: Usando la API de Cloudflare (Recomendado)

### Paso 1: Obtener un Token de API de Cloudflare

1. Ve a: https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usa el template "Edit Cloudflare Workers" o crea uno personalizado con:
   - **Account**: Cloudflare Pages:Read
   - **Zone**: Zone:Read (opcional, si necesitas acceso a zonas)
4. Copia el token generado

### Paso 2: Configurar las variables de entorno

```bash
export CLOUDFLARE_API_TOKEN='tu-token-aqui'
export CLOUDFLARE_ACCOUNT_ID='tu-account-id'  # Opcional, se puede obtener del wrangler.toml
```

Para encontrar tu Account ID:
- Ve a: https://dash.cloudflare.com/
- Está en la barra lateral derecha

### Paso 3: Ejecutar el script

```bash
./scripts/download-deploy-from-cloudflare.sh
```

O para un deploy específico:
```bash
./scripts/download-deploy-from-cloudflare.sh <DEPLOY_ID>
```

El script:
- Listará los últimos 5 deploys
- Descargará los detalles del deploy
- Intentará descargar archivos del worker
- Buscará referencias a WhatsApp

Los archivos se guardarán en: `recovered-from-cloudflare/`

## Método 2: Desde el Navegador (Más directo)

### Paso 1: Abrir la aplicación en producción

Abre tu aplicación en el navegador (ej: `clases.solverive.com`)

### Paso 2: Abrir DevTools

Presiona `F12` o `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)

### Paso 3: Buscar el código del webhook

#### Opción A: Desde Sources

1. Ve a la pestaña **Sources**
2. Busca archivos que contengan:
   - `whatsapp`
   - `webhook`
   - `_worker.js`
   - Archivos en `/api/whatsapp/`
3. Abre el archivo y copia el código
4. Guárdalo en: `recovered-whatsapp/webhook-route.js`

#### Opción B: Desde Network

1. Ve a la pestaña **Network**
2. Filtra por: `whatsapp` o `webhook`
3. Si hay requests, haz click en ellos
4. Revisa la pestaña **Response** o **Preview**
5. Copia el código relevante

#### Opción C: Buscar en código minificado

1. En **Sources**, busca archivos `.js`
2. Usa `Cmd+F` / `Ctrl+F` para buscar:
   - `cancelar`
   - `agendar`
   - `ver clases` o `ver mis clases`
   - `whatsapp`
3. Copia las funciones relacionadas

### Paso 4: Analizar el código recuperado

Si obtuviste código JavaScript (minificado o no):

```bash
node scripts/analyze-whatsapp-code.js recovered-whatsapp/webhook-code.js
```

Este script:
- Buscará patrones relacionados con WhatsApp
- Extraerá funciones relevantes
- Identificará endpoints
- Generará un análisis en `analysis.json`

## Método 3: Desde Cloudflare Dashboard

1. Ve a: https://dash.cloudflare.com/
2. Selecciona tu cuenta
3. Ve a **Workers & Pages** → **Pages**
4. Selecciona el proyecto `clases-bot`
5. Ve a **Deployments**
6. Selecciona el deploy de producción
7. Revisa los **Logs** para ver el código ejecutado
8. Si hay opción de descargar, úsala

## Lo que necesitamos encontrar

El código del webhook debería contener:

1. **Manejo de mensajes entrantes**:
   - Recepción de mensajes de WhatsApp
   - Identificación del usuario por teléfono
   - Parsing de comandos o botones

2. **Tres opciones principales**:
   - **Cancelar**: Cancelar una reserva/clase
   - **Agendar**: Agendar/inscribir en una clase
   - **Ver clases**: Mostrar las clases del usuario

3. **Envío de mensajes interactivos**:
   - Botones (buttons)
   - Listas (lists)
   - Mensajes de texto

4. **Cálculo de fechas**:
   - Próxima clase del usuario
   - Fechas de clases fijas
   - Lógica de "hoy" vs "próxima"

## Estructura esperada del webhook

```typescript
// app/api/whatsapp/webhook/route.ts
export async function POST(request: NextRequest) {
  // 1. Recibir mensaje de WhatsApp
  // 2. Identificar usuario por teléfono
  // 3. Determinar acción (cancelar/agendar/ver clases)
  // 4. Procesar la acción
  // 5. Responder con mensaje interactivo o texto
}
```

## Después de recuperar el código

Una vez que tengas el código:

1. Guárdalo en `recovered-whatsapp/`
2. Ejecuta el script de análisis
3. Comparte el código conmigo para reconstruirlo
4. O puedo ayudarte a reconstruirlo basándome en la funcionalidad

## Comandos útiles

```bash
# Descargar desde Cloudflare API
./scripts/download-deploy-from-cloudflare.sh

# Ver instrucciones para extraer desde navegador
./scripts/extract-whatsapp-from-browser.sh

# Analizar código recuperado
node scripts/analyze-whatsapp-code.js <archivo-js>
```

