export type EstadoPeriodo = 'proximo' | 'en_curso' | 'cerrado'

/**
 * Próximo: todavía no empieza el cursado. En curso: ya empezó y no llegó (o no
 * se sabe) su cierre. Cerrado: ya pasó la fecha de cierre de la asignatura.
 */
export function estadoPeriodo(
  inicioCursado: Date,
  cierreAsignatura: Date | null,
  hoy: Date,
): EstadoPeriodo {
  if (inicioCursado > hoy) return 'proximo'
  if (cierreAsignatura && cierreAsignatura < hoy) return 'cerrado'
  return 'en_curso'
}
