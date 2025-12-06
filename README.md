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

1. Conecta tu repositorio a Cloudflare Pages
2. Configura el build:
   - Build command: `npm run build`
   - Build output directory: `.next`
3. Agrega las variables de entorno:
   - En Cloudflare Pages Dashboard > Settings > Environment Variables
   - No necesitas configurar nada, D1 se conecta automáticamente

### 7. Ejecutar migraciones en producción
```bash
npm run db:migrate:remote
```

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

