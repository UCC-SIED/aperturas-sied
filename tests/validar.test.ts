import { describe, it, expect } from 'vitest'
import { validarFechas, tipoValidoParaUnidad } from '@/lib/validar'

const ok = {
  inicioCursado: new Date(2026, 7, 5),
  aperturaInscripcion: new Date(2026, 6, 26),
  cierreInscripcion: new Date(2026, 7, 2),
  finCursado: new Date(2026, 8, 5),
  aperturaAfi: new Date(2026, 8, 6),
  cierreAfi: new Date(2026, 8, 27),
  cierreAsignatura: new Date(2026, 9, 5),
  actas: new Date(2026, 9, 8),
}

describe('validarFechas', () => {
  it('un ciclo bien armado no reporta nada', () => {
    expect(validarFechas(ok)).toEqual([])
  })

  it('detecta inscripción que abre después de empezar el cursado', () => {
    const p = validarFechas({ ...ok, aperturaInscripcion: new Date(2026, 7, 10) })
    expect(p).toContain('la inscripción abre después de empezar el cursado')
  })

  it('detecta inscripción que cierra antes de abrir', () => {
    const p = validarFechas({ ...ok, cierreInscripcion: new Date(2026, 6, 20) })
    expect(p).toContain('la inscripción cierra antes de abrir')
  })

  it('detecta cursado que termina antes de empezar', () => {
    const p = validarFechas({ ...ok, finCursado: new Date(2026, 6, 1) })
    expect(p).toContain('el cursado termina antes de empezar')
  })

  it('detecta AFI que vence antes de abrir', () => {
    const p = validarFechas({ ...ok, cierreAfi: new Date(2026, 8, 1) })
    expect(p).toContain('el AFI vence antes de abrir')
  })

  it('detecta cierre de asignatura anterior al vencimiento del AFI', () => {
    const p = validarFechas({ ...ok, cierreAsignatura: new Date(2026, 8, 10) })
    expect(p).toContain('la asignatura cierra antes de que venza el AFI')
  })

  it('detecta actas anteriores al cierre de la asignatura', () => {
    const p = validarFechas({ ...ok, actas: new Date(2026, 9, 1) })
    expect(p).toContain('las actas son anteriores al cierre de la asignatura')
  })

  it('detecta años imposibles (typo de carga)', () => {
    expect(validarFechas({ ...ok, inicioCursado: new Date(2062, 7, 5) })).toContain('hay fechas con años imposibles')
    expect(validarFechas({ ...ok, actas: new Date(2016, 9, 8) })).toContain('hay fechas con años imposibles')
  })

  it('ignora los huecos: faltar una fecha no es incoherencia', () => {
    expect(validarFechas({ ...ok, aperturaAfi: null, cierreAfi: null, actas: null })).toEqual([])
  })

  it('acumula varios problemas de la misma fila', () => {
    const p = validarFechas({
      ...ok,
      aperturaInscripcion: new Date(2026, 7, 10),
      finCursado: new Date(2026, 6, 1),
    })
    expect(p.length).toBeGreaterThanOrEqual(2)
  })
})

describe('tipoValidoParaUnidad', () => {
  it('posgrado sólo abre mensuales', () => {
    expect(tipoValidoParaUnidad('posgrado', 'mensual')).toBe(true)
    expect(tipoValidoParaUnidad('posgrado', 'bimestral')).toBe(false)
    expect(tipoValidoParaUnidad('posgrado', 'cuatrimestral')).toBe(false)
  })

  it('educación sólo abre bimestrales o cuatrimestrales', () => {
    expect(tipoValidoParaUnidad('educacion', 'bimestral')).toBe(true)
    expect(tipoValidoParaUnidad('educacion', 'cuatrimestral')).toBe(true)
    expect(tipoValidoParaUnidad('educacion', 'mensual')).toBe(false)
  })

  it('una unidad inexistente no valida ningún tipo', () => {
    expect(tipoValidoParaUnidad('otra', 'mensual')).toBe(false)
  })
})
