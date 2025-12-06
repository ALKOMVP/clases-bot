# Clases Bot - Sistema de Gestión de Clases de Yoga

Sistema de gestión de clases y alumnos para profesora de yoga.

## Stack Tecnológico

- **Next.js 14** - Framework React
- **Tailwind CSS** - Estilos
- **Cloudflare D1** - Base de datos SQLite (gratis)
- **Cloudflare Pages** - Hosting (gratis)

## Configuración Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear base de datos D1 en Cloudflare
```bash
wrangler d1 create clases-db
```

Esto te dará un output como:
```
✅ Successfully created DB 'clases-db' in region EEUR
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "clases-db"
database_id = "xxxxx-xxxxx-xxxxx"
```

### 3. Actualizar `wrangler.toml`
Copia los valores de `database_id` y `database_name` al archivo `wrangler.toml`.

### 4. Ejecutar migraciones localmente
```bash
npm run db:migrate
```

### 5. Desarrollo local
Para desarrollo local con la base de datos:
```bash
wrangler pages dev .next --d1=DB=clases-db
```

O usar Next.js dev (sin DB):
```bash
npm run dev
```

### 6. Desplegar a Cloudflare Pages

#### Opción A: Deploy manual
```bash
# 1. Build para Cloudflare
npm run build:cloudflare

# 2. Deploy
npx wrangler pages deploy .vercel/output/static --project-name=clases-bot
```

#### Opción B: Deploy automático desde GitHub
1. Conecta tu repositorio a Cloudflare Pages desde el dashboard
2. Configura el build:
   - Build command: `npm run build:cloudflare`
   - Build output directory: `.vercel/output/static`
   - Root directory: `/`
3. Configura el binding de D1:
   - En Cloudflare Pages Dashboard > Settings > Functions
   - Agrega el binding D1: `DB` -> `clases-db` (database_id: 5ebf2f88-4c0c-4766-85ef-2c5b65ed87e2)

### 7. Ejecutar migraciones en producción
```bash
npm run db:migrate:remote
```

## URL de Producción

- **Deploy actual**: https://36ecf086.clases-bot.pages.dev
- **URL personalizada**: Configura un dominio personalizado desde Cloudflare Pages Dashboard

## Credenciales de Acceso

- **Usuario**: `yoga`
- **Contraseña**: `yoga`

## Estructura de Base de Datos

- **usuario**: Alumnos registrados (DNI como clave primaria)
- **clase**: Horarios fijos de clases (fecha + hora como clave primaria)
- **reserva**: Inscripciones de alumnos a clases (DNI + fecha + hora como clave primaria)

## Horarios de Clases

Las clases se generan con los siguientes horarios:
- **Lunes**: 17:30, 19:00
- **Martes**: 10:00, 17:30, 19:00
- **Jueves**: 10:00, 16:00, 17:30, 19:00
- **Sábado**: 09:30, 11:00

## Funcionalidades

- ✅ Sistema de autenticación simple
- ✅ CRUD completo de Alumnos
- ✅ CRUD completo de Clases
- ✅ CRUD completo de Reservas
- ✅ Dashboard principal
- ✅ Interfaz moderna con Tailwind CSS

