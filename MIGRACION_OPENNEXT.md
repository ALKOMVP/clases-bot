# Migración a OpenNext - Estado Actual

## ⚠️ Migración en Progreso

Estamos migrando de `@cloudflare/next-on-pages` a `@opennextjs/cloudflare`.

## Cambios Realizados

1. ✅ Instalado `@opennextjs/cloudflare@1.14.4`
2. ✅ Actualizado `wrangler` a `^4.49.1`
3. ✅ Creado `open-next.config.ts`
4. ✅ Actualizado scripts en `package.json`
5. ⚠️ **Pendiente**: Limpiar referencias a `@cloudflare/next-on-pages` en las rutas API
6. ⚠️ **Pendiente**: Actualizar acceso a D1 database para OpenNext

## Problemas Actuales

1. **Errores de sintaxis** en `app/api/clases/route.ts`, `app/api/reservas/route.ts`, `app/api/usuarios/route.ts`
   - Bloques try-catch incompletos después de eliminar código
   - Referencias a `context` que no está definido

2. **Acceso a D1 Database**
   - En OpenNext, los bindings están disponibles a través de `process.env.DB` o a través del objeto `env` pasado en el contexto
   - Necesitamos actualizar todas las rutas API para usar este patrón

## Próximos Pasos

1. Limpiar manualmente todos los archivos de rutas API
2. Actualizar el acceso a D1 para usar `process.env.DB`
3. Probar el build con OpenNext
4. Deploy y test

## Referencias

- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [OpenNext GitHub](https://github.com/opennextjs/opennextjs-aws)

