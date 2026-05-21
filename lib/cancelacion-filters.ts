/**
 * Cancelación fija (es_temporal = 0): el alumno fijo no asiste ese día.
 * Cancelación temporal (es_temporal = 1): anula una reserva temporal, no la fija del mismo día.
 */
export function isCancelacionTemporal(esTemporal: unknown): boolean {
  return esTemporal === 1 || esTemporal === true;
}

/** Condición SQL: la cancelación anula la reserva temporal de esa fecha. */
export const SQL_CANCELACION_ANULA_TEMPORAL =
  '(COALESCE(c.es_temporal, 0) = 1)';

export const SQL_CANCELACION_ANULA_TEMPORAL_C2 =
  '(COALESCE(c2.es_temporal, 0) = 1)';

/** En listados con alias r/c: fija bloqueada solo por cancelación fija; temporal solo por cancelación temporal. */
export const SQL_CANCELACION_APLICA_A_RESERVA = `(
  (COALESCE(r.es_reasignacion, 0) = 1 AND ${SQL_CANCELACION_ANULA_TEMPORAL})
  OR (COALESCE(r.es_reasignacion, 0) != 1 AND COALESCE(c.es_temporal, 0) = 0)
)`;
