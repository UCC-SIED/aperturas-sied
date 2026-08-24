import * as XLSX from 'xlsx'
import { parseFecha } from '../../src/lib/normalizar'
import type { FilaAsignatura } from './tipos'

function celda(fila: Record<string, unknown>, exactas: string[], contiene?: string): string {
  for (const k of Object.keys(fila)) {
    const kn = k.trim().toUpperCase()
    if (exactas.some((c) => kn === c.toUpperCase()) || (contiene && kn.includes(contiene.toUpperCase()))) {
      return String(fila[k] ?? '').trim()
    }
  }
  return ''
}

export function parseEducacion(buffer: Buffer): FilaAsignatura[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const filas: FilaAsignatura[] = []
  for (const nombreHoja of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nombreHoja], { defval: '' })
    for (const fila of json) {
      const tieneEncabezado = Object.keys(fila).some((k) => k.trim().toUpperCase() === 'ASIGNATURA')
      const nombre = celda(fila, ['ASIGNATURA'])
      if (!tieneEncabezado || !nombre) continue
      const orden = celda(fila, ['ORDEN'])
      filas.push({
        unidad: 'educacion',
        carrera: nombreHoja.trim(),
        cohorte: celda(fila, ['COHORTE']) || null,
        codigo: celda(fila, ['CÓDIGO DE LA ASIGNATURA', 'CODIGO DE LA ASIGNATURA']) || null,
        nombre,
        catedra: celda(fila, ['CATEDRA']) || null,
        cargaHoraria: null,
        orden: orden ? Number(orden) || null : null,
        duracion: celda(fila, ['DURACIÓN', 'DURACION']) || null,
        estadoOrigen: celda(fila, ['ESTADO LA ASIGNATURA', 'ESTADO DE LA ASIGNATURA']),
        periodoNombre: null,
        fechas: {
          inicioCursado: parseFecha(celda(fila, ['INICIO DE CURSADO'])),
          aperturaInscripcion: parseFecha(celda(fila, ['APERTURA DE INSCRIPCIÓN', 'APERTURA DE INSCRIPCION'])),
          cierreInscripcion: parseFecha(celda(fila, ['CIERRE DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCION'])),
          finCursado: parseFecha(celda(fila, [], 'LIMITES DE ENTREGA')),
          aperturaAfi: parseFecha(celda(fila, ['APERTURA DE AFI'])),
          cierreAfi: parseFecha(celda(fila, ['VENCIMIENTO DEL AFI', 'CIERRE DE AFI'])),
          cierreAsignatura: parseFecha(celda(fila, ['CIERRE DE ASIGNATURA'])),
        },
      })
    }
  }
  return filas
}
