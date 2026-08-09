import { describe, it, expect } from 'vitest'
import { semaforo } from '@/lib/semaforo'

const hoy = new Date('2026-08-08')
const en15dias = new Date('2026-08-23')
const en60dias = new Date('2026-10-07')

describe('semaforo', () => {
  it('finalizada es verde siempre', () => {
    expect(semaforo('finalizacion', en15dias, hoy)).toBe('verde')
    expect(semaforo('finalizacion', null, hoy)).toBe('verde')
  })
  it('maquetacion/revision con inscripción cerca es amarillo', () => {
    expect(semaforo('maquetacion', en15dias, hoy)).toBe('amarillo')
    expect(semaforo('revision', en15dias, hoy)).toBe('amarillo')
  })
  it('etapas tempranas con inscripción cerca es rojo', () => {
    expect(semaforo('sin_novedad', en15dias, hoy)).toBe('rojo')
    expect(semaforo('contratacion', en15dias, hoy)).toBe('rojo')
    expect(semaforo('construccion', en15dias, hoy)).toBe('rojo')
  })
  it('lejos de la inscripción o sin fecha es gris', () => {
    expect(semaforo('construccion', en60dias, hoy)).toBe('gris')
    expect(semaforo('maquetacion', null, hoy)).toBe('gris')
  })
  it('inscripción ya pasada cuenta como cerca', () => {
    expect(semaforo('construccion', new Date('2026-08-01'), hoy)).toBe('rojo')
  })
})
