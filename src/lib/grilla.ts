/**
 * La grilla del planificador: una fila por cohorte, una columna por período.
 *
 * La decisión que toma una dirección de carrera no es "esta asignatura ¿cuándo
 * abre?", sino "en este período, ¿qué le toca cursar a cada cohorte?". Cada
 * camada avanza por el plan a su propio ritmo.
 *
 * Una apertura es única por (asignatura, período), pero puede estar asociada a
 * varias cohortes: en ese caso aparece en todas sus filas.
 */

export type AperturaGrilla = {
  id: number
  asignaturaCodigo: string
  periodoId: number
  cohorteIds: number[]
  /** Nombres de otras carreras que también la abrieron (transversal), sin la propia. */
  carrerasCompartidas: string[]
  asignatura: { codigo: string; nombre: string; estado: string }
  aperturaInscripcion: Date | null
}

type Cohorte = { id: number; nombre: string }
type Periodo = { id: number; nombre: string }

export type Grilla = {
  /** Aperturas de esa cohorte en ese período. */
  celda(cohorteId: number, periodoId: number): AperturaGrilla[]
  /** Nombres de los períodos donde esa cohorte ya tiene esa asignatura. */
  yaCursa(cohorteId: number, codigo: string): string[]
  /** Cuántas asignaturas tiene planificadas esa cohorte en total. */
  totalDe(cohorteId: number): number
}

export function armarGrilla(
  cohortes: Cohorte[],
  periodos: Periodo[],
  aperturas: AperturaGrilla[],
): Grilla {
  const porCelda = new Map<string, AperturaGrilla[]>()
  const porAsignatura = new Map<string, string[]>()
  const total = new Map<number, number>()

  const nombrePeriodo = new Map(periodos.map((p) => [p.id, p.nombre]))
  const ordenPeriodo = new Map(periodos.map((p, i) => [p.id, i]))

  for (const ap of aperturas) {
    for (const cohorteId of ap.cohorteIds) {
      const clave = `${cohorteId}|${ap.periodoId}`
      porCelda.set(clave, [...(porCelda.get(clave) ?? []), ap])
      total.set(cohorteId, (total.get(cohorteId) ?? 0) + 1)

      const nombre = nombrePeriodo.get(ap.periodoId)
      if (nombre) {
        const k = `${cohorteId}|${ap.asignaturaCodigo}`
        porAsignatura.set(k, [...(porAsignatura.get(k) ?? []), nombre])
      }
    }
  }

  // dentro de la celda, alfabético; entre períodos, en el orden del calendario
  for (const lista of porCelda.values()) {
    lista.sort((a, b) => a.asignatura.nombre.localeCompare(b.asignatura.nombre))
  }
  for (const [k, nombres] of porAsignatura) {
    const cohorteId = Number(k.split('|')[0])
    const suyas = aperturas.filter(
      (a) => a.cohorteIds.includes(cohorteId) && a.asignaturaCodigo === k.split('|')[1],
    )
    porAsignatura.set(
      k,
      suyas
        .slice()
        .sort((a, b) => (ordenPeriodo.get(a.periodoId) ?? 0) - (ordenPeriodo.get(b.periodoId) ?? 0))
        .map((a) => nombrePeriodo.get(a.periodoId)!)
        .filter(Boolean),
    )
    void nombres
  }

  return {
    celda: (cohorteId, periodoId) => porCelda.get(`${cohorteId}|${periodoId}`) ?? [],
    yaCursa: (cohorteId, codigo) => porAsignatura.get(`${cohorteId}|${codigo}`) ?? [],
    totalDe: (cohorteId) => total.get(cohorteId) ?? 0,
  }
}
