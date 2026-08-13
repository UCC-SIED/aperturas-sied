import { ESTADOS, ESTADO_LABELS, type Estado } from './estados'

export type FilaSeguimiento = {
  codigo: string
  estado: string
  docente: string | null
  asesor: string | null
  observaciones: string | null
}

export type CambioSeguimiento = {
  codigo: string
  campos: {
    estado?: string
    docente?: string | null
    asesor?: string | null
    observaciones?: string | null
  }
  /** Descripción legible para el historial; vacía si sólo cambiaron datos menores. */
  detalle: string
}

/**
 * Distingue tres casos: el campo no vino (undefined, se deja como está),
 * vino vacío (null, se borra) o vino con texto. Sin esta distinción, un input
 * deshabilitado —que el navegador no envía— borraría el dato guardado.
 */
const leer = (v: FormDataEntryValue | null): string | null | undefined => {
  if (v === null) return undefined
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * Compara lo que vino del formulario contra lo que hay guardado y devuelve
 * sólo lo que cambió. La pantalla de seguimiento manda las 30 filas de una
 * carrera juntas; sin esto, cada guardado escribiría 30 registros de historial
 * aunque se haya tocado una sola celda.
 */
export function calcularCambios(
  actuales: FilaSeguimiento[],
  form: { get(name: string): FormDataEntryValue | null },
): CambioSeguimiento[] {
  const cambios: CambioSeguimiento[] = []

  for (const a of actuales) {
    const estado = String(form.get(`estado_${a.codigo}`) ?? a.estado)
    const docente = leer(form.get(`docente_${a.codigo}`))
    const asesor = leer(form.get(`asesor_${a.codigo}`))
    const observaciones = leer(form.get(`observaciones_${a.codigo}`))

    if (!(ESTADOS as readonly string[]).includes(estado)) {
      throw new Error(`Estado inválido para ${a.codigo}: ${estado}`)
    }

    const campos: CambioSeguimiento['campos'] = {}
    const partes: string[] = []

    if (estado !== a.estado) {
      campos.estado = estado
      partes.push(
        `${ESTADO_LABELS[a.estado as Estado] ?? a.estado} → ${ESTADO_LABELS[estado as Estado] ?? estado}`,
      )
    }
    if (docente !== undefined && docente !== a.docente) {
      campos.docente = docente
      partes.push(docente ? `docente: ${docente}` : 'se quitó el docente')
    }
    if (asesor !== undefined && asesor !== a.asesor) {
      campos.asesor = asesor
      partes.push(asesor ? `asesor: ${asesor}` : 'se quitó el asesor')
    }
    if (observaciones !== undefined && observaciones !== a.observaciones) {
      campos.observaciones = observaciones
      partes.push(observaciones ? 'observaciones actualizadas' : 'se borraron las observaciones')
    }

    if (Object.keys(campos).length) {
      cambios.push({ codigo: a.codigo, campos, detalle: partes.join(' · ') })
    }
  }

  return cambios
}
