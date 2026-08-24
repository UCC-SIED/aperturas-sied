export type Sesion = {
  id: number
  nombre: string
  email: string
  rol: string
  carreraIds: number[]
  /** Mientras sea true, sólo puede pasar por /elegir-contrasena. */
  debeElegirContrasena: boolean
}

export const ROLES = ['admin', 'sied', 'director', 'unidad', 'consulta'] as const
export const ROL_LABELS: Record<string, string> = {
  admin: 'Administración',
  sied: 'Equipo SIED',
  director: 'Dirección de carrera',
  unidad: 'Unidad académica',
  consulta: 'Consulta',
}

export const ROL_DESCRIPCIONES: Record<string, string> = {
  admin: 'Todo lo del equipo SIED, y además gestiona usuarios, roles y permisos.',
  sied: 'Planifica cualquier carrera y edita el estado de producción de las asignaturas.',
  director: 'Planifica las aperturas de sus carreras. Ve el estado de producción pero no lo edita.',
  unidad: 'Planifica las aperturas de todas las carreras de su unidad académica (Posgrado o Educación). Ve el estado de producción pero no lo edita.',
  consulta: 'Sólo lectura.',
}

/** El equipo SIED y la administración comparten los permisos de trabajo. */
function esEquipo(s: Sesion | null): boolean {
  return s?.rol === 'sied' || s?.rol === 'admin'
}

/**
 * Director y unidad académica comparten la misma mecánica: planifican sólo
 * las carreras de `carreraIds` — la diferencia es quién puebla esa lista
 * (asignación puntual vs. todas las de su unidad, resuelto en sesionActual).
 */
function tieneCarrerasAsignadas(s: Sesion | null): boolean {
  return s?.rol === 'director' || s?.rol === 'unidad'
}

/** Puede planificar aperturas de esa carrera (agregar, quitar, mover de período). */
export function puedeEditarCarrera(s: Sesion | null, carreraId: number): boolean {
  if (!s) return false
  if (esEquipo(s)) return true
  if (tieneCarrerasAsignadas(s)) return s.carreraIds.includes(carreraId)
  return false
}

/** El estado de producción lo maneja el SIED: los directores lo ven, no lo tocan. */
export function puedeEditarProduccion(s: Sesion | null): boolean {
  return esEquipo(s)
}

/** Alta y baja de usuarios, cambio de roles y de carreras asignadas. */
export function puedeAdministrar(s: Sesion | null): boolean {
  return s?.rol === 'admin'
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
  return tieneCarrerasAsignadas(s) ? s.carreraIds : null
}

/** El dominio institucional: sólo entra gente de la universidad. */
export const DOMINIO_INSTITUCIONAL = 'ucc.edu.ar'

export function esCorreoInstitucional(email: string | null | undefined): boolean {
  if (!email) return false
  const dominio = email.trim().toLowerCase().split('@')[1]
  return dominio === DOMINIO_INSTITUCIONAL || (dominio?.endsWith(`.${DOMINIO_INSTITUCIONAL}`) ?? false)
}
