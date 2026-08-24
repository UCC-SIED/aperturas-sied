import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePeriodosEducacion } from '../migracion/parsers/periodos'

// Réplica de la hoja real de períodos de Educación
function fixture(): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Periodo', 'Mes', 'INICIO DE CURSADO', 'APERTURA DE INSCRIPCIÓN', 'CIERRE DE INSCRIPCIÓN', 'APERTURA DE AFI', 'VENCIMIENTO DE AFI', 'LIMITES DE ENTREGA DE ACTIVIDADES OBLIGATORIAS - FINALIZACIÓN DE CURSADO', 'CIERRE DE ASIGNATURA', 'ACTAS'],
    ['Bimestre A', 'Marzo', '04/03/26', '23/02/26', '01/03/26', '09/04/26', '23/04/26', '25/04/26', '29/04/26', '02/05/26'],
    ['Bimestre B', 'Mayo', '13/05/26', '04/05/26', '10/05/26', '11/06/26', '25/06/26', '27/06/26', '01/07/26', '04/07/26'],
    ['Bimestre C', 'Agosto', '12/08/26', '03/08/26', '09/08/26', '17/09/26', '01/10/26', '03/10/26', '07/10/26', '10/10/26'],
    ['Cuatrimestral A', 'Marzo', '04/03/26', '23/02/26', '01/03/26', '28/05/26', '11/06/26', '13/06/26', '17/06/26', '20/06/26'],
    // el typo "Cuatrimestal" está en la planilla real, y sin fechas de inscripción
    ['Cuatrimestal B', 'Mayo', '13/05/26', '-', '-', '27/08/26', '10/09/26', '12/09/26', '16/09/26', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Apertura de inscripción 00:00 hs', '', '', '', '', '', '', '', '', ''],
  ]), 'Periodos')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parsePeriodosEducacion', () => {
  it('lee los períodos con su ciclo completo', () => {
    const p = parsePeriodosEducacion(fixture())
    expect(p).toHaveLength(5)
    const bimA = p.find((x) => x.nombre === 'Bimestre A')!
    expect(bimA).toMatchObject({ tipo: 'bimestral', mes: 'Marzo' })
    expect(bimA.inicioCursado).toEqual(new Date(2026, 2, 4))
    expect(bimA.aperturaInscripcion).toEqual(new Date(2026, 1, 23))
    expect(bimA.aperturaAfi).toEqual(new Date(2026, 3, 9))
    expect(bimA.cierreAfi).toEqual(new Date(2026, 3, 23))
    expect(bimA.finCursado).toEqual(new Date(2026, 3, 25))
    expect(bimA.cierreAsignatura).toEqual(new Date(2026, 3, 29))
  })

  it('distingue bimestral de cuatrimestral aunque arranquen el mismo día', () => {
    const p = parsePeriodosEducacion(fixture())
    const mismoInicio = p.filter((x) => x.inicioCursado.getTime() === new Date(2026, 2, 4).getTime())
    expect(mismoInicio).toHaveLength(2)
    expect(mismoInicio.map((x) => x.tipo).sort()).toEqual(['bimestral', 'cuatrimestral'])
    // el cuatrimestral rinde AFI casi dos meses después
    expect(mismoInicio.find((x) => x.tipo === 'cuatrimestral')!.aperturaAfi).toEqual(new Date(2026, 4, 28))
  })

  it('tolera el typo "Cuatrimestal" y las fechas vacías', () => {
    const p = parsePeriodosEducacion(fixture())
    const b = p.find((x) => x.nombre === 'Cuatrimestal B')!
    expect(b.tipo).toBe('cuatrimestral')
    expect(b.aperturaInscripcion).toBeNull()
    expect(b.cierreAsignatura).toEqual(new Date(2026, 8, 16))
  })

  it('ignora las filas de leyenda del pie', () => {
    const p = parsePeriodosEducacion(fixture())
    expect(p.some((x) => x.nombre.includes('00:00'))).toBe(false)
  })
})
