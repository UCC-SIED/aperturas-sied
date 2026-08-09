export type Sesion = {
  id: number
  nombre: string
  email: string
  rol: string
  carreraIds: number[]
}

export const ROLES = ['sied', 'director', 'consulta'] as const
export const ROL_LABELS: Record<string, string> = {
  sied: 'Equipo SIED',
  director: 'Dirección de carrera',
  consulta: 'Consulta',
}

/** Puede planificar aperturas de esa carrera (agregar, quitar, mover de período). */
export function puedeEditarCarrera(s: Sesion | null, carreraId: number): boolean {
  if (!s) return false
  if (s.rol === 'sied') return true
  if (s.rol === 'director') return s.carreraIds.includes(carreraId)
  return false
}

/** El estado de producción lo maneja el SIED: los directores lo ven, no lo tocan. */
export function puedeEditarProduccion(s: Sesion | null): boolean {
  return s?.rol === 'sied'
}

export function esSoloLectura(s: Sesion | null): boolean {
  return !s || s.rol === 'consulta'
}

/**
 * Carreras que el usuario tiene derecho a ver.
 * `null` significa "todas" (SIED y consulta); una lista acota a las suyas.
 */
export function carrerasVisibles(s: Sesion | null): number[] | null {
  if (!s) return []
  return s.rol === 'director' ? s.carreraIds : null
}
