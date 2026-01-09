# Sincronizar Base de Datos Local con Producción

Este documento explica cómo mantener tu base de datos local sincronizada con producción.

## 🚀 Sincronización Rápida

Para sincronizar tu base de datos local con producción (incluyendo todos los alumnos, clases y reservas):

```bash
npm run db:sync:from-prod
```

O directamente:

```bash
./scripts/sync-db-from-prod.sh
```

## 📋 Qué hace el script

1. **Descarga el backup de producción**: Exporta toda la base de datos de Cloudflare D1 (producción)
2. **Limpia la base de datos local**: Elimina todos los datos locales existentes
3. **Restaura el backup**: Importa todos los datos de producción en tu base de datos local
4. **Verifica los datos**: Muestra un resumen de lo que se importó

## ⚠️ Advertencias

- **Este proceso SOBRESCRIBE todos los datos locales**
- Si tienes datos locales que quieres conservar, haz un backup primero
- Se te pedirá confirmación antes de sobrescribir si detecta datos locales existentes

## 🎯 Casos de Uso

### Sincronización Inicial

Si es la primera vez que configuras el proyecto local:

```bash
# 1. Aplicar migraciones para crear las tablas
npm run db:migrate

# 2. Sincronizar datos desde producción
npm run db:sync:from-prod

# 3. Ejecutar la aplicación
npm run dev:cloudflare
```

### Sincronización Periódica

Si quieres actualizar tu base de datos local con los últimos datos de producción:

```bash
npm run db:sync:from-prod
```

### Desarrollo con Datos de Producción

Si quieres iniciar el proyecto con datos sincronizados automáticamente:

```bash
npm run dev:init
```

Este comando:
1. Sincroniza los datos desde producción
2. Inicia el servidor de desarrollo con wrangler (que usa la BD local)

## 🔄 Flujo Recomendado de Desarrollo

1. **Al inicio del día de trabajo**:
   ```bash
   npm run db:sync:from-prod
   ```

2. **Durante el desarrollo**:
   ```bash
   npm run dev:cloudflare
   ```

3. **Antes de hacer cambios importantes**:
   ```bash
   npm run db:backup  # Hacer backup local por si acaso
   ```

4. **Al finalizar cambios**:
   - Los cambios locales NO afectan producción automáticamente
   - Para aplicar cambios a producción, necesitas hacer deploy

## 📊 Verificar Datos Sincronizados

Después de sincronizar, puedes verificar que los datos se importaron correctamente:

```bash
# Ver usuarios
wrangler d1 execute clases-db --local --command="SELECT COUNT(*) as count FROM usuario;"

# Ver clases
wrangler d1 execute clases-db --local --command="SELECT COUNT(*) as count FROM clase;"

# Ver reservas
wrangler d1 execute clases-db --local --command="SELECT COUNT(*) as count FROM reserva;"
```

## 🛠️ Solución de Problemas

### Error: "wrangler no está instalado"

```bash
npm install -g wrangler
```

### Error: "No se puede conectar a Cloudflare"

Asegúrate de estar autenticado:

```bash
wrangler login
```

### Error al importar el backup

Si el método estándar falla, el script intentará automáticamente un método alternativo. Si ambos fallan:

1. Verifica que el archivo de backup se descargó correctamente
2. Verifica que las migraciones estén aplicadas: `npm run db:migrate`
3. Intenta importar manualmente:

```bash
# Descargar backup manualmente
wrangler d1 export clases-db --remote --output backup.sql

# Importar manualmente
wrangler d1 execute clases-db --local --file=backup.sql
```

## 🔐 Seguridad

- Los datos de producción contienen información real de alumnos
- No compartas la base de datos local con personas no autorizadas
- Asegúrate de que `.wrangler/` esté en `.gitignore` (ya debería estarlo)

## 📝 Notas Importantes

- **La base de datos local es completamente independiente de producción**
- Los cambios locales NO se sincronizan automáticamente con producción
- Para aplicar cambios a producción, necesitas hacer deploy
- La sincronización es **unidireccional**: Producción → Local

## 🎓 Alternativas

Si prefieres trabajar con datos de prueba en lugar de producción:

1. Usa el mock DB: `npm run dev` (usa datos en memoria)
2. Crea datos de prueba usando los scripts en `scripts/`
3. No sincronices desde producción y trabaja con datos locales de prueba

