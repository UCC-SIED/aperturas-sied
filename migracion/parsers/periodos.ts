import * as XLSX from 'xlsx'
import { parseFecha } from '../../src/lib/normalizar'

export type PeriodoCalendario = {
  nombre: string
  tipo: 'bimestral' | 'cuatrimestral'
  mes: string | null
  inicioCursado: Date
  aperturaInscripcion: Date | null
  cierreInscripcion: Date | null
  finCursado: Date | null
  aperturaAfi: Date | null
  cierreAfi: Date | null
  cierreAsignatura: Date | null
}

function celda(fila: Record<string, unknown>, exactas: string[], contiene?: string): string {
  for (const k of Object.keys(fila)) {
    const kn = k.trim().toUpperCase()
    if (exactas.some((c) => kn === c.toUpperCase()) || (contiene && kn.includes(contiene.toUpperCase()))) {
      return String(fila[k] ?? '').trim()
    }
  }
  return ''
}

/**
 * Lee la hoja de períodos de Educación (Bimestre A, Cuatrimestral A, ...).
 * Es la fuente de verdad del calendario: cada período trae su ciclo completo,
 * y por eso un bimestral y un cuatrimestral que arrancan el mismo día son
 * períodos distintos.
 */
export function parsePeriodosEducacion(buffer: Buffer): PeriodoCalendario[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const periodos: PeriodoCalendario[] = []
  for (const nombreHoja of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nombreHoja], { defval: '' })
    const esHojaDePeriodos = json.some((f) =>
      Object.keys(f).some((k) => k.trim().toUpperCase() === 'PERIODO') &&
      Object.keys(f).some((k) => k.trim().toUpperCase().includes('INICIO DE CURSADO')),
    )
    if (!esHojaDePeriodos) continue

    for (const fila of json) {
      const nombre = celda(fila, ['PERIODO'])
      const inicioCursado = parseFecha(celda(fila, ['INICIO DE CURSADO']))
      // Las filas de leyenda del pie tienen texto en Periodo pero ninguna fecha
      if (!nombre || !inicioCursado) continue
      // "Cuatrimestal" (sin r) aparece así en la planilla real
      const esCuatri = /cuatrimes?t/i.test(nombre)
      periodos.push({
        nombre,
        tipo: esCuatri ? 'cuatrimestral' : 'bimestral',
        mes: celda(fila, ['MES']) || null,
        inicioCursado,
        aperturaInscripcion: parseFecha(celda(fila, ['APERTURA DE INSCRIPCIÓN', 'APERTURA DE INSCRIPCION'])),
        cierreInscripcion: parseFecha(celda(fila, ['CIERRE DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCION'])),
        finCursado: parseFecha(celda(fila, [], 'LIMITES DE ENTREGA')),
        aperturaAfi: parseFecha(celda(fila, ['APERTURA DE AFI'])),
        cierreAfi: parseFecha(celda(fila, ['VENCIMIENTO DE AFI', 'VENCIMIENTO DEL AFI', 'CIERRE DE AFI'])),
        cierreAsignatura: parseFecha(celda(fila, ['CIERRE DE ASIGNATURA'])),
      })
    }
  }
  return periodos
}
