export type CicloFechas = {
  inicioCursado: Date | null
  aperturaInscripcion: Date | null
  cierreInscripcion: Date | null
  finCursado: Date | null
  aperturaAfi: Date | null
  cierreAfi: Date | null
  cierreAsignatura: Date | null
  actas: Date | null
}

const ANIO_MIN = 2020
const ANIO_MAX = 2035

/**
 * Revisa que el ciclo de una asignatura tenga sentido cronológico.
 * Los huecos no son error (media planilla tiene celdas vacías); lo que se
 * reporta es el orden imposible, que casi siempre viene de un error de carga.
 */
export function validarFechas(f: CicloFechas): string[] {
  const problemas: string[] = []
  // true cuando `a` cae después de `b`, es decir, cuando el orden está invertido
  const invertido = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() > b.getTime()

  if (invertido(f.aperturaInscripcion, f.inicioCursado)) {
    problemas.push('la inscripción abre después de empezar el cursado')
  }
  if (invertido(f.aperturaInscripcion, f.cierreInscripcion)) {
    problemas.push('la inscripción cierra antes de abrir')
  }
  if (invertido(f.inicioCursado, f.finCursado)) {
    problemas.push('el cursado termina antes de empezar')
  }
  if (invertido(f.aperturaAfi, f.cierreAfi)) {
    problemas.push('el AFI vence antes de abrir')
  }
  if (invertido(f.cierreAfi, f.cierreAsignatura)) {
    problemas.push('la asignatura cierra antes de que venza el AFI')
  }
  if (invertido(f.cierreAsignatura, f.actas)) {
    problemas.push('las actas son anteriores al cierre de la asignatura')
  }

  const fechas = Object.values(f).filter((d): d is Date => d instanceof Date)
  if (fechas.some((d) => d.getFullYear() < ANIO_MIN || d.getFullYear() > ANIO_MAX)) {
    problemas.push('hay fechas con años imposibles')
  }

  return problemas
}
