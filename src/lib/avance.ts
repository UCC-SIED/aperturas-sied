import { ESTADOS, type Estado } from './estados'

export type Avance = {
  total: number
  finalizadas: number
  porcentaje: number
  porEstado: Record<Estado, number>
}

/** Cuánto del plan está terminado. Equivale al panel de control de la planilla. */
export function resumirAvance(asignaturas: { estado: string }[]): Avance {
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>
  for (const a of asignaturas) {
    if (a.estado in porEstado) porEstado[a.estado as Estado]++
  }
  const total = asignaturas.length
  const finalizadas = porEstado.finalizacion
  return {
    total,
    finalizadas,
    porcentaje: total ? Math.round((finalizadas / total) * 100) : 0,
    porEstado,
  }
}
