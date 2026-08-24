import type { CicloFechas } from './validar'

/**
 * Las fechas de un período mensual de Posgrado se derivan del inicio de
 * cursado con reglas fijas. Tenerlas acá evita cargar seis fechas a mano por
 * período y que se cuelen incoherencias que después hay que perseguir.
 *
 * **Sólo Posgrado.** Educación tiene su propio calendario, con bimestrales y
 * cuatrimestrales, y otras reglas: aplicar éstas ahí daría fechas inventadas.
 */

const DIAS_ANTES_DE_INSCRIBIR = 10
const DIAS_DE_INSCRIPCION = 7
const MESES_HASTA_EL_LIMITE_DE_ENTREGAS = 1
const DIAS_DE_AFI = 20
const MESES_HASTA_EL_CIERRE = 2

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

/** El ciclo completo a partir del inicio de cursado. */
export function cicloPosgrado(inicioCursado: Date): CicloFechas {
  const aperturaInscripcion = sumarDias(inicioCursado, -DIAS_ANTES_DE_INSCRIBIR)
  const finCursado = sumarMeses(inicioCursado, MESES_HASTA_EL_LIMITE_DE_ENTREGAS)
  // El AFI abre al día siguiente de cerrar las entregas previas obligatorias.
  const aperturaAfi = sumarDias(finCursado, 1)

  return {
    inicioCursado,
    aperturaInscripcion,
    // Siete días de inscripción, que dejan dos días libres antes de que abra
    // el aula para terminar de configurarla.
    cierreInscripcion: sumarDias(aperturaInscripcion, DIAS_DE_INSCRIPCION),
    finCursado,
    aperturaAfi,
    // Veinte días de AFI: los diez últimos quedan para reentregas o para que
    // el docente corrija antes de que cierre el aula.
    cierreAfi: sumarDias(aperturaAfi, DIAS_DE_AFI),
    cierreAsignatura: sumarMeses(inicioCursado, MESES_HASTA_EL_CIERRE),
  }
}
