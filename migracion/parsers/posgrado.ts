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

export function parsePosgrado(buffer: Buffer): FilaAsignatura[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const filas: FilaAsignatura[] = []
  for (const nombreHoja of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nombreHoja], { defval: '' })
    for (const fila of json) {
      const tieneEncabezado = Object.keys(fila).some((k) => k.trim().toUpperCase() === 'ASIGNATURA')
      const nombre = celda(fila, ['ASIGNATURA'])
      if (!tieneEncabezado || !nombre) continue
      const codigo = celda(fila, ['CÓDIGO DE LA ASIGNATURA', 'CODIGO DE LA ASIGNATURA'])
      const orden = celda(fila, ['ORDEN'])
      const carga = celda(fila, ['CARGA HORARIA'])
      filas.push({
        unidad: 'posgrado',
        carrera: nombreHoja.trim(),
        cohorte: celda(fila, ['COHORTE']) || null,
        codigo: codigo || null,
        nombre,
        catedra: celda(fila, ['CATEDRA']) || null,
        cargaHoraria: carga ? Number(carga) || null : null,
        orden: orden ? Number(orden) || null : null,
        duracion: null,
        estadoOrigen: celda(fila, ['ESTADO LA ASIGNATURA', 'ESTADO DE LA ASIGNATURA']),
        periodoNombre: celda(fila, ['PERIODO']) || null,
        fechas: {
          inicioCursado: parseFecha(celda(fila, ['INICIO DE CURSADO'])),
          aperturaInscripcion: parseFecha(celda(fila, ['APERTURA DE INSCRIPCIÓN', 'APERTURA DE INSCRIPCION'])),
          cierreInscripcion: parseFecha(celda(fila, ['CIERRE DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCION'])),
          finCursado: parseFecha(celda(fila, [], 'LIMITES DE ENTREGA')),
          aperturaAfi: parseFecha(celda(fila, ['APERTURA DE AFI'])),
          cierreAfi: parseFecha(celda(fila, ['CIERRE DE AFI', 'VENCIMIENTO DEL AFI'])),
          cierreAsignatura: parseFecha(celda(fila, ['CIERRE DE ASIGNATURA'])),
          actas: parseFecha(celda(fila, ['ACTAS'])),
        },
      })
    }
  }
  return filas
}
