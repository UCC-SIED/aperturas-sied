import type { CicloFechas } from './validar'

/**
 * Las fechas de un período se derivan con reglas fijas de calendario. Tenerlas
 * acá evita cargar siete fechas a mano por período y que se cuelen
 * incoherencias que después hay que perseguir.
 *
 * Las dos unidades comparten la primera mitad —la inscripción abre 10 días
 * antes del cursado y cierra 3 días antes— y difieren en la segunda, que
 * además va en orden inverso:
 *
 * - **Posgrado** (mensual): cierran las entregas y al día siguiente abre el AFI.
 * - **Educación** (bimestral y cuatrimestral): vence el AFI y dos días después
 *   cierran las entregas.
 */

const DIAS_ANTES_DE_INSCRIBIR = 10
const DIAS_ANTES_DE_CERRAR_INSCRIPCION = 3

// Posgrado
const MESES_HASTA_EL_LIMITE_DE_ENTREGAS = 1
const DIAS_DE_AFI_POSGRADO = 20
const MESES_HASTA_EL_CIERRE = 2

// Educación
const DIAS_DE_AFI_EDUCACION = 14
const DIAS_DEL_AFI_A_LAS_ENTREGAS = 2
const DIAS_DE_LAS_ENTREGAS_AL_CIERRE = 4
/** Doce semanas más un día: los dos cuatrimestrales de 2026 dan exactamente eso. */
const DIAS_HASTA_EL_AFI_CUATRIMESTRAL = 85

/** Suma días sin tocar la hora, para no correr la fecha al cruzar un horario de verano. */
function sumarDias(fecha: Date, dias: number): Date {
  const r = new Date(fecha)
  r.setDate(r.getDate() + dias)
  return r
}

/**
 * Suma meses de calendario: el 3 de marzo más un mes es el 3 de abril.
 * Si el día no existe en el mes destino —un 31 de enero más un mes— cae en el
 * último día de ese mes en vez de desbordarse al siguiente.
 */
function sumarMeses(fecha: Date, meses: number): Date {
  const dia = fecha.getDate()
  const r = new Date(fecha)
  r.setDate(1)
  r.setMonth(r.getMonth() + meses)
  const ultimoDelMes = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()
  r.setDate(Math.min(dia, ultimoDelMes))
  return r
}

/** La inscripción, que funciona igual en las dos unidades. */
function inscripcion(inicioCursado: Date) {
  return {
    aperturaInscripcion: sumarDias(inicioCursado, -DIAS_ANTES_DE_INSCRIBIR),
    // Tres días antes del cursado: los dos que quedan libres son para terminar
    // de configurar el aula antes de que entren.
    cierreInscripcion: sumarDias(inicioCursado, -DIAS_ANTES_DE_CERRAR_INSCRIPCION),
  }
}

/** El ciclo de un período mensual, que son los de Posgrado. */
export function cicloPosgrado(inicioCursado: Date): CicloFechas {
  const finCursado = sumarMeses(inicioCursado, MESES_HASTA_EL_LIMITE_DE_ENTREGAS)
  // El AFI abre al día siguiente de cerrar las entregas previas obligatorias.
  const aperturaAfi = sumarDias(finCursado, 1)

  return {
    inicioCursado,
    ...inscripcion(inicioCursado),
    finCursado,
    aperturaAfi,
    // Veinte días de AFI: los diez últimos quedan para reentregas o para que
    // el docente corrija antes de que cierre el aula.
    cierreAfi: sumarDias(aperturaAfi, DIAS_DE_AFI_POSGRADO),
    cierreAsignatura: sumarMeses(inicioCursado, MESES_HASTA_EL_CIERRE),
  }
}

/**
 * El ciclo de un bimestral o un cuatrimestral, que son los de Educación.
 *
 * La apertura del AFI marca el fin del cursado y **no se puede deducir del
 * inicio**: los bimestres A y C duran cinco semanas y los B y D, cuatro, y el
 * sistema sólo guarda el tipo, no cuál de los cuatro es. Se recibe de afuera y
 * dispara las tres fechas que vienen después; sin ella, esa mitad queda vacía.
 */
export function cicloEducacion(inicioCursado: Date, aperturaAfi?: Date | null): CicloFechas {
  const base = { inicioCursado, ...inscripcion(inicioCursado) }

  if (!aperturaAfi) {
    return { ...base, finCursado: null, aperturaAfi: null, cierreAfi: null, cierreAsignatura: null }
  }

  const cierreAfi = sumarDias(aperturaAfi, DIAS_DE_AFI_EDUCACION)
  // Al revés que en Posgrado: primero vence el AFI y después cierran las entregas.
  const finCursado = sumarDias(cierreAfi, DIAS_DEL_AFI_A_LAS_ENTREGAS)

  return {
    ...base,
    aperturaAfi,
    cierreAfi,
    finCursado,
    cierreAsignatura: sumarDias(finCursado, DIAS_DE_LAS_ENTREGAS_AL_CIERRE),
  }
}

/**
 * El ciclo que corresponde al tipo de período. Devuelve null si el tipo no
 * tiene reglas, para no inventar fechas contra las que después alguien
 * planifica.
 */
export function cicloDelPeriodo(
  tipo: string,
  inicioCursado: Date,
  aperturaAfi?: Date | null,
): CicloFechas | null {
  if (tipo === 'mensual') return cicloPosgrado(inicioCursado)
  if (tipo === 'bimestral') return cicloEducacion(inicioCursado, aperturaAfi)
  if (tipo === 'cuatrimestral') {
    // Acá sí se puede proponer: los dos cuatrimestrales de 2026 abren el AFI a
    // las doce semanas exactas. Igual queda editable.
    return cicloEducacion(
      inicioCursado,
      aperturaAfi ?? sumarDias(inicioCursado, DIAS_HASTA_EL_AFI_CUATRIMESTRAL),
    )
  }
  return null
}
