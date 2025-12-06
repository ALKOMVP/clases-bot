# Guía de Configuración - Clases Bot

## Pasos para Configurar el Proyecto

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Cloudflare D1

#### Crear la base de datos:
```bash
wrangler d1 create clases-db
```

Esto te dará un output como:
```
✅ Successfully created DB 'clases-db' in region EEUR

[[d1_databases]]
binding = "DB"
database_name = "clases-db"
database_id = "xxxxx-xxxxx-xxxxx"
preview_database_id = "yyyyy-yyyyy-yyyyy"
```

#### Actualizar wrangler.toml:
Copia los valores del output anterior al archivo `wrangler.toml`:
- `database_id` → reemplaza `your-database-id-here`
- `preview_database_id` → reemplaza `your-preview-database-id-here`

### 3. Ejecutar Migraciones

#### Localmente (para desarrollo):
```bash
npm run db:migrate
```

#### En producción:
```bash
npm run db:migrate:remote
```

### 4. Desarrollo Local

#### Opción 1: Next.js dev (sin base de datos)
```bash
npm run dev
```
Abre http://localhost:3000

#### Opción 2: Con Cloudflare Pages (con base de datos)
```bash
npm run dev:cloudflare
```
Esto iniciará el servidor con acceso a la base de datos D1.

### 5. Desplegar a Cloudflare Pages

#### Opción A: Desde GitHub (Recomendado)

1. Sube tu código a GitHub
2. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
3. Click en "Create a project" > "Connect to Git"
4. Selecciona tu repositorio
5. Configura el build:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
6. En "Environment variables", no necesitas agregar nada (D1 se conecta automáticamente)
7. En "Functions and assets", asegúrate de que el binding de D1 esté configurado:
   - Variable name: `DB`
   - D1 database: `clases-db`
8. Click en "Save and Deploy"

#### Opción B: Desde Wrangler CLI

```bash
npm run build
wrangler pages deploy .next --project-name=clases-bot
```

### 6. Configurar D1 en Cloudflare Pages

Después del primer deploy:

1. Ve a tu proyecto en Cloudflare Pages
2. Settings > Functions
3. En "D1 database bindings", agrega:
   - Variable name: `DB`
   - D1 database: `clases-db`
4. Guarda y haz un nuevo deploy

### 7. Acceder a la Aplicación

Una vez desplegado, accede a tu aplicación con:
- **Usuario**: `yoga`
- **Contraseña**: `yoga`

## Notas Importantes

- Las clases se crean manualmente desde la interfaz
- Los horarios sugeridos son:
  - Lunes: 17:30, 19:00
  - Martes: 10:00, 17:30, 19:00
  - Jueves: 10:00, 16:00, 17:30, 19:00
  - Sábado: 09:30, 11:00

## Solución de Problemas

### Error: "DB not available"
- Asegúrate de haber ejecutado las migraciones
- Verifica que el binding de D1 esté configurado en Cloudflare Pages
- En desarrollo local, usa `npm run dev:cloudflare` en lugar de `npm run dev`

### Error al hacer build
- Asegúrate de tener Node.js 18+ instalado
- Ejecuta `npm install` nuevamente
- Verifica que todas las dependencias estén instaladas

