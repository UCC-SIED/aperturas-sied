import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseEducacion } from '../migracion/parsers/educacion'

function fixture(): Buffer {
  const wb = XLSX.utils.book_new()
  // Hoja variante 1: sin DURACIÓN, con Vencimiento del AFI y ACTAS
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['COHORTE', 'CATEDRA', 'ASIGNATURA', 'CÓDIGO DE LA ASIGNATURA', 'ESTADO LA ASIGNATURA', 'INICIO DE CURSADO', 'APERTURA DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCIÓN', 'LIMITES DE ENTREGA DE ACTIVIDADES OBLIGATORIAS - FINALIZACIÓN DE CURSADO', 'APERTURA DE AFI', 'Vencimiento del AFI', 'CIERRE DE ASIGNATURA', 'ACTAS'],
    ['COHORTE  3', '', 'CORRIENTES PEDAGÓGICAS CONTEMPORÁNEAS', '1210132', '5.FINALIZADA', '07/05/25', '28/04/25', '04/05/25', '28/06/25', '12/06/25', '26/06/25', '02/07/25', '05/07/25'],
  ]), 'Ed Inicial')
  // Hoja variante 2: con DURACIÓN
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['COHORTE', 'CATEDRA', 'ASIGNATURA', 'CÓDIGO DE LA ASIGNATURA', 'DURACIÓN', 'ESTADO LA ASIGNATURA', 'INICIO DE CURSADO', 'APERTURA DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCIÓN', 'LIMITES DE ENTREGA DE ACTIVIDADES OBLIGATORIAS - FINALIZACIÓN DE CURSADO', 'APERTURA DE AFI', 'Vencimiento del AFI', 'CIERRE DE ASIGNATURA', 'ACTAS'],
    ['COHORTE  3', '', 'GESTIÓN CURRICULAR I', '1220084', 'Cuatrimestral', '5.FINALIZADA', '06/08/25', '28/07/25', '03/08/25', '22/11/25', '06/11/25', '20/11/25', '26/11/25', '29/11/25'],
  ]), 'Ciencias de la Educación')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parseEducacion', () => {
  it('lee ambas variantes de hoja', () => {
    const filas = parseEducacion(fixture())
    expect(filas).toHaveLength(2)
    const a = filas.find((x) => x.codigo === '1210132')!
    expect(a.carrera).toBe('Ed Inicial')
    expect(a.unidad).toBe('educacion')
    expect(a.periodoNombre).toBeNull()
    expect(a.fechas.inicioCursado).toEqual(new Date(2025, 4, 7))
    expect(a.fechas.cierreAfi).toEqual(new Date(2025, 5, 26))
    const b = filas.find((x) => x.codigo === '1220084')!
    expect(b.duracion).toBe('Cuatrimestral')
  })
})
