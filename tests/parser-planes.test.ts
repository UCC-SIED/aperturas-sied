import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePlanes } from '../migracion/parsers/planes'

function fixture(filas: unknown[][], hoja = 'Planes'): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), hoja)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parsePlanes', () => {
  it('lee una hoja con unidad, carrera, código, asignatura y orden', () => {
    const p = parsePlanes(fixture([
      ['UNIDAD', 'CARRERA', 'CÓDIGO', 'ASIGNATURA', 'ORDEN'],
      ['Posgrado', 'NT - Alta Gerencia', 'EP01898', 'ESTRATEGIA EXPONENCIAL', '1'],
      ['Posgrado', 'NT - Alta Gerencia', 'EP00459', 'FINANZAS Y CONTABILIDAD', '2'],
      ['Educación', 'Educación Inicial', '1210131', 'PERSPECTIVA SOCIO-HISTÓRICA', '1'],
    ]))
    expect(p).toHaveLength(3)
    expect(p[0]).toEqual({
      unidad: 'posgrado', carrera: 'NT - Alta Gerencia',
      codigo: 'EP01898', nombre: 'ESTRATEGIA EXPONENCIAL', orden: 1,
    })
    expect(p[2].unidad).toBe('educacion')
  })

  it('si no hay columna UNIDAD la deduce del código', () => {
    const p = parsePlanes(fixture([
      ['CARRERA', 'CÓDIGO', 'ASIGNATURA', 'ORDEN'],
      ['NT - Alta Gerencia', 'EP01898', 'ESTRATEGIA EXPONENCIAL', '1'],
      ['Educación Inicial', '1210131', 'PERSPECTIVA SOCIO-HISTÓRICA', '1'],
    ]))
    expect(p[0].unidad).toBe('posgrado')   // EP... es posgrado
    expect(p[1].unidad).toBe('educacion')  // numérico es educación
  })

  it('usa el nombre de la hoja como carrera si no hay columna', () => {
    const p = parsePlanes(fixture([
      ['CÓDIGO', 'ASIGNATURA', 'ORDEN'],
      ['EP01898', 'ESTRATEGIA EXPONENCIAL', '1'],
    ], 'NT - Alta Gerencia'))
    expect(p[0].carrera).toBe('NT - Alta Gerencia')
  })

  it('numera por posición cuando falta la columna ORDEN', () => {
    const p = parsePlanes(fixture([
      ['CARRERA', 'CÓDIGO', 'ASIGNATURA'],
      ['Una Carrera', 'EP00001', 'PRIMERA', ],
      ['Una Carrera', 'EP00002', 'SEGUNDA'],
      ['Otra Carrera', 'EP00003', 'PRIMERA DE OTRA'],
    ]))
    expect(p.map((x) => x.orden)).toEqual([1, 2, 1])
  })

  it('ignora filas sin asignatura y hojas que no son de plan', () => {
    const p = parsePlanes(fixture([
      ['CARRERA', 'CÓDIGO', 'ASIGNATURA', 'ORDEN'],
      ['Una Carrera', 'EP00001', 'PRIMERA', '1'],
      ['', '', '', ''],
      ['Una Carrera', '', '', ''],
    ]))
    expect(p).toHaveLength(1)
  })

  it('acepta asignaturas sin código (quedan con codigo null para el reporte)', () => {
    const p = parsePlanes(fixture([
      ['CARRERA', 'CÓDIGO', 'ASIGNATURA', 'ORDEN'],
      ['Una Carrera', '', 'SIN CÓDIGO AÚN', '5'],
    ]))
    expect(p[0].codigo).toBeNull()
    expect(p[0].nombre).toBe('SIN CÓDIGO AÚN')
  })
})
