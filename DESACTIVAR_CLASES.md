# Desactivar clases sin borrarlas

Esta funcionalidad permite desactivar una clase (o una fecha concreta) sin eliminar la clase ni las inscripciones. Útil cuando la profe no da determinada clase ese mes o una fecha puntual.

## Niveles de desactivación

1. **A nivel de clase (sección Clases)**  
   - En **Clases** > tabla de clases semanales: botón **Desactivar** / **Activar**.  
   - Al desactivar: la clase no se muestra en el calendario como disponible, no aparece en WhatsApp para reservar, cancelar ni en "Ver mis clases". Los alumnos ya inscritos se mantienen.  
   - Al reactivar: todo vuelve a mostrarse con los mismos alumnos.

2. **A nivel de fecha (sección Calendario)**  
   - En **Calendario** > al hacer clic en una clase se abre el modal: botón **Desactivar esta fecha** / **Activar esta fecha**.  
   - Solo esa fecha queda desactivada (ej. "Lunes 2 de febrero 17:30"). El resto de fechas de esa clase siguen activas.  
   - En el calendario la tarjeta de esa fecha se muestra como "Desactivada" (estilo gris/ámbar). No se pueden agregar temporales en esa fecha; los inscritos se mantienen.

## Requisito

Aplicar la migración **0010** (columna `activa` en `clase` y tabla `clase_desactivada`) en la base que use la app:

- **Desarrollo local** (localhost con `npm run dev:local`):  
  `wrangler d1 migrations apply clases-db --local`
- **Producción** (app desplegada en Cloudflare):  
  `wrangler d1 migrations apply clases-db --remote`

Si al hacer clic en "Desactivar" ves *"La base de datos no tiene la columna activa"*, estás usando la base **remota** y tenés que aplicar 0010 en remoto (comando de arriba con `--remote`). Si alguna migración anterior falla con "duplicate column", ver [APLICAR_MIGRACIONES.md](./APLICAR_MIGRACIONES.md) (marcar esa migración como aplicada y volver a aplicar).

## Pasos recomendados después de desarrollar lo básico

1. **Aplicar migración 0010** en local y en producción (ver arriba).

2. **Probar en local**  
   - Desactivar una clase en Clases y comprobar que en Calendario y en WhatsApp (reservar / cancelar / ver mis clases) ya no aparece.  
   - Reactivar y comprobar que vuelve a aparecer.  
   - Desactivar una fecha concreta desde el modal del Calendario y comprobar que esa tarjeta se ve "Desactivada" y que en WhatsApp no se ofrece esa fecha para reservar.

3. **Comunicar a la profesora**  
   - Si no da una clase todo el mes: en **Clases** > **Desactivar** esa clase.  
   - Si no da una fecha puntual (ej. un lunes): en **Calendario** > clic en esa clase ese día > **Desactivar esta fecha**.

4. **Recordatorio**  
   - Desactivar no borra alumnos; al reactivar siguen inscritos.  
   - No se pueden inscribir temporales en clases/fechas desactivadas (ni desde la web ni por WhatsApp).

5. **Opcional**  
   - Revisar con la profesora si quiere un aviso o recordatorio cuando haya clases desactivadas (por ejemplo, un resumen semanal de "clases desactivadas esta semana").
