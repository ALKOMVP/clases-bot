# 📦 Guía de Backup de la Base de Datos

## ¿Por qué hacer backup?

La base de datos D1 de Cloudflare almacena todos tus datos importantes:
- Alumnos (usuarios)
- Clases semanales
- Reservas

Aunque Cloudflare tiene snapshots automáticos, es recomendable hacer backups manuales periódicos.

## 🔄 Hacer Backup Manual

### Opción 1: Usando el script (Recomendado)

```bash
npm run db:backup
```

O directamente:
```bash
./scripts/backup-db.sh
```

Esto creará un archivo SQL en la carpeta `backups/` con un timestamp:
- `backups/clases-db-backup-20241206_143022.sql`
- También crea un enlace simbólico: `backups/clases-db-latest.sql`

### Opción 2: Comando manual

```bash
# Crear directorio de backups
mkdir -p backups

# Exportar base de datos remota
wrangler d1 export clases-db --remote --output backups/clases-db-backup-$(date +%Y%m%d_%H%M%S).sql
```

## 📁 Ubicación de los Backups

Los backups se guardan en la carpeta `backups/` en la raíz del proyecto.

**⚠️ IMPORTANTE**: Esta carpeta debería estar en `.gitignore` para no subir los backups al repositorio.

## 🔄 Restaurar desde un Backup

Si necesitas restaurar la base de datos desde un backup:

```bash
# 1. Primero, eliminar todas las tablas (si es necesario)
# O crear una nueva base de datos

# 2. Importar el backup
wrangler d1 execute clases-db --remote --file=backups/clases-db-backup-YYYYMMDD_HHMMSS.sql
```

O usando el archivo SQL directamente:

```bash
wrangler d1 execute clases-db --remote --command="$(cat backups/clases-db-backup-YYYYMMDD_HHMMSS.sql)"
```

## 📅 Frecuencia Recomendada

- **Backup diario**: Si tienes muchos cambios diarios
- **Backup semanal**: Si los cambios son menos frecuentes
- **Backup antes de migraciones importantes**: Siempre antes de ejecutar migraciones

## 🤖 Automatización (Opcional)

Puedes automatizar los backups usando cron (Linux/Mac) o tareas programadas (Windows):

### Linux/Mac (cron)

```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * cd /ruta/al/proyecto && npm run db:backup
```

### GitHub Actions (Recomendado para proyectos en GitHub)

Crea `.github/workflows/backup-db.yml`:

```yaml
name: Backup Database

on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2 AM UTC
  workflow_dispatch:  # Permite ejecución manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Wrangler
        run: npm install -g wrangler
      - name: Authenticate Wrangler
        run: echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" | wrangler login
      - name: Backup Database
        run: npm run db:backup
      - name: Upload Backup
        uses: actions/upload-artifact@v3
        with:
          name: db-backup
          path: backups/*.sql
          retention-days: 30
```

## 🔐 Seguridad

- **No subir backups al repositorio**: Asegúrate de que `backups/` esté en `.gitignore`
- **Almacenar backups en lugar seguro**: Considera subirlos a un servicio de almacenamiento en la nube (Google Drive, Dropbox, etc.)
- **Encriptar backups sensibles**: Si contienen información personal, considera encriptarlos

## 📝 Verificar un Backup

Para verificar que un backup es válido:

```bash
# Ver el contenido del backup
head -n 50 backups/clases-db-backup-YYYYMMDD_HHMMSS.sql

# Verificar que contiene las tablas esperadas
grep -i "CREATE TABLE" backups/clases-db-backup-YYYYMMDD_HHMMSS.sql
```

## 🆘 En caso de pérdida de datos

1. **No entrar en pánico**: Cloudflare D1 tiene snapshots automáticos
2. **Verificar snapshots en Cloudflare Dashboard**: Ve a Workers & Pages > D1 > clases-db > Backups
3. **Restaurar desde backup manual**: Si tienes un backup reciente
4. **Contactar soporte de Cloudflare**: Si es un problema crítico

## 🔗 Enlaces Útiles

- [Documentación de Wrangler D1 Export](https://developers.cloudflare.com/workers/wrangler/commands/#d1)
- [Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/learning/time-travel/)





