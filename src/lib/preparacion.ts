import type { Estado } from './estados'

/**
 * Qué aulas tiene que preparar el equipo de tecnología, y en qué orden.
 *
 * La urgencia no es la fecha sola ni el estado solo: una asignatura terminada
 * que abre mañana hay que montarla ya; una en construcción que abre en dos
 * meses todavía no es problema de tecnología, es del área de contenidos.
 */

export type ParaPreparar = {
  aperturaId: number
  codigo: string
  nombre: string
  estado: string
  periodo: string
  aperturaInscripcion: Date | null
  carreras: string[]
  cohortes: string[]
  /** Es la misma aula para varias carreras: se monta una sola vez. */
  compartida: boolean
}

export type Urgencia = 'montar-ya' | 'preparar' | 'esperando-contenido' | 'sin-fecha'

export const URGENCIA_LABELS: Record<Urgencia, string> = {
  'montar-ya': 'Montar ya',
  preparar: 'Preparar',
  'esperando-contenido': 'Falta contenido',
  'sin-fecha': 'Sin fecha',
}

/** Estados en los que el contenido ya está listo para montar el aula. */
const LISTAS_PARA_MONTAR: string[] = ['maquetacion', 'finalizacion']

export const DIAS_URGENTE = 21

export function urgenciaDe(
  estado: string,
  aperturaInscripcion: Date | null,
  hoy: Date,
): Urgencia {
  if (!aperturaInscripcion) return 'sin-fecha'
  const dias = Math.ceil((aperturaInscripcion.getTime() - hoy.getTime()) / 86_400_000)
  const listo = LISTAS_PARA_MONTAR.includes(estado)

  if (!listo) return 'esperando-contenido'
  return dias <= DIAS_URGENTE ? 'montar-ya' : 'preparar'
}

/** Días que faltan para que abra la inscripción. Negativo si ya abrió. */
export function diasHasta(fecha: Date | null, hoy: Date): number | null {
  if (!fecha) return null
  return Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000)
}

/**
 * Ordena lo que hay que preparar: primero lo que abre antes, y ante la misma
 * fecha, lo que ya tiene el contenido listo (que es lo que se puede hacer hoy).
 */
export function ordenarParaPreparar(items: ParaPreparar[], hoy: Date): ParaPreparar[] {
  const peso: Record<Urgencia, number> = {
    'montar-ya': 0,
    preparar: 1,
    'esperando-contenido': 2,
    'sin-fecha': 3,
  }
  return [...items].sort((a, b) => {
    const ua = urgenciaDe(a.estado, a.aperturaInscripcion, hoy)
    const ub = urgenciaDe(b.estado, b.aperturaInscripcion, hoy)
    if (peso[ua] !== peso[ub]) return peso[ua] - peso[ub]
    const fa = a.aperturaInscripcion?.getTime() ?? Infinity
    const fb = b.aperturaInscripcion?.getTime() ?? Infinity
    if (fa !== fb) return fa - fb
    return a.nombre.localeCompare(b.nombre)
  })
}

/** Cuántas hay en cada situación, para el resumen de arriba. */
export function contarPorUrgencia(items: ParaPreparar[], hoy: Date): Record<Urgencia, number> {
  const cuenta: Record<Urgencia, number> = {
    'montar-ya': 0, preparar: 0, 'esperando-contenido': 0, 'sin-fecha': 0,
  }
  for (const i of items) cuenta[urgenciaDe(i.estado, i.aperturaInscripcion, hoy)]++
  return cuenta
}

export type { Estado }
