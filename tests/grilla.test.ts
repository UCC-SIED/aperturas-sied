import { describe, it, expect } from 'vitest'
import { armarGrilla, type AperturaGrilla } from '@/lib/grilla'

const cohortes = [
  { id: 1, nombre: 'COHORTE 2025' },
  { id: 2, nombre: 'COHORTE 2026' },
]
const periodos = [
  { id: 10, nombre: 'Agosto' },
  { id: 11, nombre: 'Septiembre' },
]

const ap = (
  id: number, codigo: string, periodoId: number, cohorteIds: number[],
): AperturaGrilla => ({
  id, asignaturaCodigo: codigo, periodoId,
  cohorteIds,
  asignatura: { codigo, nombre: `Asignatura ${codigo}`, estado: 'finalizacion' },
  aperturaInscripcion: null,
})

describe('armarGrilla', () => {
  it('ubica cada apertura en la celda de su cohorte y período', () => {
    const g = armarGrilla(cohortes, periodos, [
      ap(1, 'A1', 10, [1]),
      ap(2, 'A2', 11, [2]),
    ])
    expect(g.celda(1, 10).map((x) => x.asignaturaCodigo)).toEqual(['A1'])
    expect(g.celda(2, 11).map((x) => x.asignaturaCodigo)).toEqual(['A2'])
    expect(g.celda(1, 11)).toEqual([])
    expect(g.celda(2, 10)).toEqual([])
  })

  it('una apertura compartida por dos cohortes aparece en las dos filas', () => {
    const g = armarGrilla(cohortes, periodos, [ap(1, 'COMUN', 10, [1, 2])])
    expect(g.celda(1, 10)).toHaveLength(1)
    expect(g.celda(2, 10)).toHaveLength(1)
    expect(g.celda(1, 10)[0].id).toBe(g.celda(2, 10)[0].id)
  })

  it('varias asignaturas en la misma celda', () => {
    const g = armarGrilla(cohortes, periodos, [
      ap(1, 'A1', 10, [1]),
      ap(2, 'A2', 10, [1]),
    ])
    expect(g.celda(1, 10).map((x) => x.asignaturaCodigo).sort()).toEqual(['A1', 'A2'])
  })

  it('dice en qué períodos una cohorte ya tiene una asignatura', () => {
    const g = armarGrilla(cohortes, periodos, [
      ap(1, 'REPE', 10, [1]),
      ap(2, 'OTRA', 11, [1]),
    ])
    expect(g.yaCursa(1, 'REPE')).toEqual(['Agosto'])
    expect(g.yaCursa(1, 'OTRA')).toEqual(['Septiembre'])
    expect(g.yaCursa(1, 'NUEVA')).toEqual([])
    // la cohorte 2 no cursó ninguna
    expect(g.yaCursa(2, 'REPE')).toEqual([])
  })

  it('acumula si la misma cohorte la cursa en dos períodos', () => {
    const g = armarGrilla(cohortes, periodos, [
      ap(1, 'REPE', 10, [1]),
      ap(2, 'REPE', 11, [1]),
    ])
    expect(g.yaCursa(1, 'REPE')).toEqual(['Agosto', 'Septiembre'])
  })

  it('cuenta cuántas asignaturas tiene cada cohorte planificadas', () => {
    const g = armarGrilla(cohortes, periodos, [
      ap(1, 'A1', 10, [1]),
      ap(2, 'A2', 11, [1]),
      ap(3, 'A3', 10, [2]),
    ])
    expect(g.totalDe(1)).toBe(2)
    expect(g.totalDe(2)).toBe(1)
  })

  it('sin aperturas, todas las celdas vacías', () => {
    const g = armarGrilla(cohortes, periodos, [])
    expect(g.celda(1, 10)).toEqual([])
    expect(g.totalDe(1)).toBe(0)
  })
})
