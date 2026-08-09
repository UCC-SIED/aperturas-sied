import type { Estado } from './estados'

export const DIAS_ALERTA = 30
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris'

export function semaforo(
  estado: Estado,
  aperturaInscripcion: Date | null,
  hoy: Date,
): Semaforo {
  if (estado === 'finalizacion') return 'verde'
  if (!aperturaInscripcion) return 'gris'
  const dias = (aperturaInscripcion.getTime() - hoy.getTime()) / 86_400_000
  if (dias > DIAS_ALERTA) return 'gris'
  return estado === 'maquetacion' || estado === 'revision' ? 'amarillo' : 'rojo'
}
