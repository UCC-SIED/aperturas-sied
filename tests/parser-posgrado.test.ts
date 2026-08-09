import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePosgrado } from '../migracion/parsers/posgrado'

function fixture(): Buffer {
  const wb = XLSX.utils.book_new()
  const hoja = XLSX.utils.aoa_to_sheet([
    ['COHORTE', 'ORDEN', 'CATEDRA', 'ASIGNATURA', 'CÓDIGO DE LA ASIGNATURA', 'Transveralidad', 'Carga Horaria', 'ESTADO LA ASIGNATURA', 'PERIODO', 'INICIO DE CURSADO', 'APERTURA DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCIÓN', 'LIMITES DE ENTREGA DE ACTIVIDADES OBLIGATORIAS - FINALIZACIÓN DE CURSADO', 'APERTURA DE AFI', 'CIERRE DE AFI ', 'CIERRE DE ASIGNATURA'],
    ['COHORTE  2025', '1', 'DA', 'REFLEXIÓN Y ANÁLISIS ESTRATÉGICO', 'EP00878', 'I7 - 23', '24', '5.FINALIZADA', 'Mensual_Marzo_2026', '04/03/26', '22/02/26', '01/03/26', '04/04/26', '05/04/26', '26/04/26', '04/05/26'],
    ['COHORTE  2025', '19', 'DA', 'INSTRUMENTOS DEL SISTEMA FINANCIERO', 'EP01396', '-', '21', '3.MAQUETACIÓN', 'Mensual_Agosto_2026', '05/08/26', '26/07/26', '02/08/26', '05/09/26', '06/09/26', '27/09/26', '05/10/26'],
    ['COHORTE  2025', '2', 'DA', 'SIN CÓDIGO TODAVÍA', '', '-', '', '', '', '', '', '', '', '', '', ''],
  ])
  XLSX.utils.book_append_sheet(wb, hoja, 'DIRECCION DE EMPRESAS')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parsePosgrado', () => {
  it('extrae filas con código, período y fechas', () => {
    const filas = parsePosgrado(fixture())
    const f = filas.find((x) => x.codigo === 'EP00878')!
    expect(f.carrera).toBe('DIRECCION DE EMPRESAS')
    expect(f.cohorte).toBe('COHORTE  2025')
    expect(f.orden).toBe(1)
    expect(f.cargaHoraria).toBe(24)
    expect(f.estadoOrigen).toBe('5.FINALIZADA')
    expect(f.periodoNombre).toBe('Mensual_Marzo_2026')
    expect(f.fechas.inicioCursado).toEqual(new Date(2026, 2, 4))
    expect(f.fechas.cierreAsignatura).toEqual(new Date(2026, 4, 4))
  })
  it('conserva filas sin código (para el reporte)', () => {
    const filas = parsePosgrado(fixture())
    expect(filas.some((x) => x.codigo === null && x.nombre === 'SIN CÓDIGO TODAVÍA')).toBe(true)
  })
  it('ignora hojas sin el encabezado esperado', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['PANEL DE CONTROL'], ['otra cosa']]), 'Dashboard')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    expect(parsePosgrado(buf)).toEqual([])
  })
})
