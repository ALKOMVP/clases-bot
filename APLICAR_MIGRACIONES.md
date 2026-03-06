# Aplicar Migraciones a la Base de Datos

Para que la base de datos tenga la misma estructura que en producción, necesitas aplicar las siguientes migraciones:

## Migraciones a Aplicar

1. **0001_initial.sql** - Crea las tablas iniciales (`usuario`, `clase`, `reserva`)
2. **0002_add_telefono.sql** - Agrega campo `telefono` a la tabla `usuario`
3. **0003_make_email_optional.sql** - Migración intermedia (email se elimina en 0004)
4. **0004_remove_email_add_activo.sql** - Elimina `email` y agrega campo `activo` a la tabla `usuario`
5. **0005_add_reserva_temporal_fields.sql** - Agrega campos `fecha_clase` y `es_reasignacion` a la tabla `reserva`
6. **0006_create_lista_espera.sql** - Crea la tabla `lista_espera`
7. **0007_create_cancelacion.sql** - Crea la tabla `cancelacion`
8. **0008_add_numero_to_lista_espera.sql** - Agrega campo `numero` a `lista_espera`
9. **0009_create_clase_recuperar.sql** - Crea la tabla `clase_recuperar`
10. **0010_add_clase_activa_and_desactivada.sql** - Agrega columna `activa` a `clase` y tabla `clase_desactivada` (desactivar clases sin borrarlas)

## Método 1: Script Automático (Recomendado)

Ejecuta el script de sincronización que aplicará todas las migraciones necesarias:

```bash
./scripts/sync-db-structure.sh
```

Este script:
- Aplica todas las migraciones pendientes automáticamente
- Verifica que todas las tablas y columnas existan
- Verifica si las clases están inicializadas

## Método 2: Usando Wrangler CLI (Local)

Aplica todas las migraciones localmente:

```bash
# Aplicar todas las migraciones locales
npm run db:migrate

# O usar wrangler directamente
wrangler d1 migrations apply clases-db --local
```

## Método 3: Usando Wrangler CLI (Producción/Remoto)

Aplica todas las migraciones en Cloudflare:

```bash
# Aplicar todas las migraciones remotas
npm run db:migrate:remote

# O usar wrangler directamente
wrangler d1 migrations apply clases-db --remote
```

## Método 4: Usando Cloudflare Dashboard

1. Ve a tu proyecto en Cloudflare Dashboard
2. Navega a D1 Database
3. Selecciona tu base de datos (`clases-db`)
4. Ve a la pestaña "SQL Editor"
5. Ejecuta cada migración una por una desde los archivos en `migrations/`

## Desarrollo Local con Base de Datos Real

Para usar la base de datos D1 local (en lugar del mock), ejecuta:

```bash
# Aplicar migraciones primero
npm run db:migrate

# Luego ejecutar la aplicación con wrangler (usa la BD real)
wrangler pages dev .next --local --d1=DB=clases-db

# O si prefieres usar Next.js dev, las migraciones se aplicarán automáticamente
# pero seguirás usando el mock DB
npm run dev
```

**Nota importante**: El mock DB es útil para desarrollo rápido, pero para probar funcionalidades que dependen de la estructura exacta de la BD (como reservas temporales), es mejor usar la BD D1 local con wrangler.

## Verificar Migraciones

Después de aplicar las migraciones, verifica que las tablas y columnas existan:

```sql
-- Verificar columnas de reserva
PRAGMA table_info(reserva);

-- Verificar tabla lista_espera
SELECT name FROM sqlite_master WHERE type='table' AND name='lista_espera';

-- Verificar tabla cancelacion
SELECT name FROM sqlite_master WHERE type='table' AND name='cancelacion';
```

## Si alguna migración falla con "duplicate column name"

Si tu base local ya tiene las columnas o tablas que una migración intenta crear, esa migración falla. Para seguir:

1. Marcar la migración que falló como aplicada (reemplazá `NOMBRE_ARCHIVO.sql` por el nombre real, ej. `0005_add_reserva_temporal_fields.sql` o `0008_add_numero_to_lista_espera.sql`):
   ```bash
   wrangler d1 execute clases-db --local --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('NOMBRE_ARCHIVO.sql');"
   ```
2. Volver a aplicar migraciones:
   ```bash
   wrangler d1 migrations apply clases-db --local
   ```

Ejemplos de migraciones que suelen fallar si la base ya estaba modificada:
- **0005**: columnas `fecha_clase` o `es_reasignacion` ya existen en `reserva`
- **0008**: columna `numero` ya existe en `lista_espera`

## Nota Importante

Si las columnas `fecha_clase` o `es_reasignacion` ya existen en la tabla `reserva`, la migración 0005 fallará con un error. Usá la sección anterior para marcarla como aplicada y continuar.

Si las tablas `lista_espera` o `cancelacion` ya existen, las migraciones 0006 y 0007 usarán `CREATE TABLE IF NOT EXISTS`, por lo que no causarán errores.

