import { describe, it, expect } from 'vitest'
import {
  puedeEditarCarrera, puedeEditarProduccion, esSoloLectura, carrerasVisibles,
  puedeAdministrar, esCorreoInstitucional,
} from '@/lib/permisos'

const admin = { id: 0, nombre: 'Admin', email: 'tecnologia.sied@ucc.edu.ar', rol: 'admin', carreraIds: [], debeElegirContrasena: false }
const sied = { id: 1, nombre: 'Goni', email: 'g@ucc.edu.ar', rol: 'sied', carreraIds: [], debeElegirContrasena: false }
const dir = { id: 2, nombre: 'Directora', email: 'd@ucc.edu.ar', rol: 'director', carreraIds: [7, 9], debeElegirContrasena: false }
const consulta = { id: 3, nombre: 'Dirección', email: 'c@ucc.edu.ar', rol: 'consulta', carreraIds: [], debeElegirContrasena: false }
// carreraIds ya viene resuelto por sesionActual con todas las de su unidad.
const unidad = { id: 4, nombre: 'Posgrado', email: 'u@ucc.edu.ar', rol: 'unidad', carreraIds: [7, 8, 9], debeElegirContrasena: false }

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

  it('unidad académica planifica todas las carreras de su unidad, no edita producción', () => {
    expect(puedeEditarCarrera(unidad, 7)).toBe(true)
    expect(puedeEditarCarrera(unidad, 8)).toBe(true)
    expect(puedeEditarCarrera(unidad, 999)).toBe(false)
    expect(carrerasVisibles(unidad)).toEqual([7, 8, 9])
    expect(puedeEditarProduccion(unidad)).toBe(false)
    expect(esSoloLectura(unidad)).toBe(false)
  })
})

describe('administración', () => {
  it('sólo el rol admin gestiona usuarios', () => {
    expect(puedeAdministrar(admin)).toBe(true)
    expect(puedeAdministrar(sied)).toBe(false)
    expect(puedeAdministrar(dir)).toBe(false)
    expect(puedeAdministrar(consulta)).toBe(false)
    expect(puedeAdministrar(null)).toBe(false)
  })

  it('admin trabaja como el equipo SIED: planifica todo y edita producción', () => {
    expect(puedeEditarCarrera(admin, 7)).toBe(true)
    expect(puedeEditarCarrera(admin, 999)).toBe(true)
    expect(puedeEditarProduccion(admin)).toBe(true)
    expect(carrerasVisibles(admin)).toBeNull()
    expect(esSoloLectura(admin)).toBe(false)
  })
})

describe('esCorreoInstitucional', () => {
  it('acepta el dominio de la universidad y sus subdominios', () => {
    expect(esCorreoInstitucional('tecnologia.sied@ucc.edu.ar')).toBe(true)
    expect(esCorreoInstitucional('alguien@campus.ucc.edu.ar')).toBe(true)
    expect(esCorreoInstitucional('MAYUSCULAS@UCC.EDU.AR')).toBe(true)
  })

  it('rechaza cualquier otro dominio', () => {
    expect(esCorreoInstitucional('alguien@gmail.com')).toBe(false)
    expect(esCorreoInstitucional('alguien@ucc.edu.ar.falso.com')).toBe(false)
    expect(esCorreoInstitucional('alguien@otraucc.edu.ar')).toBe(false)
    expect(esCorreoInstitucional('')).toBe(false)
    expect(esCorreoInstitucional(null)).toBe(false)
  })
})
