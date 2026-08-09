import { describe, it, expect } from 'vitest'
import { puedeEditarCarrera, puedeEditarProduccion, esSoloLectura, carrerasVisibles } from '@/lib/permisos'

const sied = { id: 1, nombre: 'Goni', email: 'g@ucc.edu.ar', rol: 'sied', carreraIds: [] }
const dir = { id: 2, nombre: 'Directora', email: 'd@ucc.edu.ar', rol: 'director', carreraIds: [7, 9] }
const consulta = { id: 3, nombre: 'Dirección', email: 'c@ucc.edu.ar', rol: 'consulta', carreraIds: [] }

describe('permisos', () => {
  it('el SIED puede editar cualquier carrera', () => {
    expect(puedeEditarCarrera(sied, 7)).toBe(true)
    expect(puedeEditarCarrera(sied, 999)).toBe(true)
  })

  it('un director sólo puede editar las carreras que tiene asignadas', () => {
    expect(puedeEditarCarrera(dir, 7)).toBe(true)
    expect(puedeEditarCarrera(dir, 9)).toBe(true)
    expect(puedeEditarCarrera(dir, 8)).toBe(false)
  })

  it('consulta no puede editar nada', () => {
    expect(puedeEditarCarrera(consulta, 7)).toBe(false)
    expect(esSoloLectura(consulta)).toBe(true)
    expect(esSoloLectura(dir)).toBe(false)
  })

  it('sólo el SIED toca el estado de producción', () => {
    expect(puedeEditarProduccion(sied)).toBe(true)
    expect(puedeEditarProduccion(dir)).toBe(false)
    expect(puedeEditarProduccion(consulta)).toBe(false)
  })

  it('sin sesión no se puede nada', () => {
    expect(puedeEditarCarrera(null, 7)).toBe(false)
    expect(puedeEditarProduccion(null)).toBe(false)
    expect(esSoloLectura(null)).toBe(true)
  })

  it('carrerasVisibles: null para quien ve todo, lista para el director', () => {
    expect(carrerasVisibles(sied)).toBeNull()
    expect(carrerasVisibles(consulta)).toBeNull()
    expect(carrerasVisibles(dir)).toEqual([7, 9])
  })

  it('un director sin carreras asignadas no ve ninguna', () => {
    const huerfano = { ...dir, carreraIds: [] }
    expect(carrerasVisibles(huerfano)).toEqual([])
    expect(puedeEditarCarrera(huerfano, 7)).toBe(false)
  })
})
