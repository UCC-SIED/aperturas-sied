import { describe, it, expect } from 'vitest'
import {
  urgenciaDe, diasHasta, ordenarParaPreparar, contarPorUrgencia, type ParaPreparar,
} from '@/lib/preparacion'

const hoy = new Date(2026, 7, 10) // 10 de agosto
const enDias = (n: number) => new Date(2026, 7, 10 + n)

const item = (extra: Partial<ParaPreparar> = {}): ParaPreparar => ({
  aperturaId: 1, codigo: 'EP001', nombre: 'Una asignatura',
  estado: 'finalizacion', periodo: 'Agosto',
  aperturaInscripcion: enDias(10), carreras: ['Carrera A'], cohortes: ['2025'],
  compartida: false,
  ...extra,
})

describe('urgenciaDe', () => {
  it('terminada y con la inscripción encima: hay que montarla ya', () => {
    expect(urgenciaDe('finalizacion', enDias(5), hoy)).toBe('montar-ya')
    expect(urgenciaDe('maquetacion', enDias(20), hoy)).toBe('montar-ya')
  })

  it('terminada pero lejos: se prepara sin apuro', () => {
    expect(urgenciaDe('finalizacion', enDias(60), hoy)).toBe('preparar')
  })

  it('sin el contenido listo no es trabajo de tecnología todavía', () => {
    expect(urgenciaDe('construccion', enDias(5), hoy)).toBe('esperando-contenido')
    expect(urgenciaDe('contratacion', enDias(5), hoy)).toBe('esperando-contenido')
    expect(urgenciaDe('sin_novedad', enDias(60), hoy)).toBe('esperando-contenido')
  })

  it('una inscripción ya abierta con el aula lista es lo más urgente', () => {
    expect(urgenciaDe('finalizacion', enDias(-3), hoy)).toBe('montar-ya')
  })

  it('sin fecha de inscripción no se puede priorizar', () => {
    expect(urgenciaDe('finalizacion', null, hoy)).toBe('sin-fecha')
    expect(urgenciaDe('construccion', null, hoy)).toBe('sin-fecha')
  })
})

describe('diasHasta', () => {
  it('cuenta los días que faltan', () => {
    expect(diasHasta(enDias(7), hoy)).toBe(7)
    expect(diasHasta(enDias(0), hoy)).toBe(0)
  })
  it('da negativo si ya pasó', () => {
    expect(diasHasta(enDias(-4), hoy)).toBe(-4)
  })
  it('sin fecha devuelve null', () => {
    expect(diasHasta(null, hoy)).toBeNull()
  })
})

describe('ordenarParaPreparar', () => {
  it('primero lo urgente, después lo que espera contenido', () => {
    const orden = ordenarParaPreparar([
      item({ aperturaId: 1, nombre: 'Espera contenido', estado: 'construccion', aperturaInscripcion: enDias(3) }),
      item({ aperturaId: 2, nombre: 'Montar ya', estado: 'finalizacion', aperturaInscripcion: enDias(9) }),
      item({ aperturaId: 3, nombre: 'Sin fecha', aperturaInscripcion: null }),
      item({ aperturaId: 4, nombre: 'Preparar', estado: 'finalizacion', aperturaInscripcion: enDias(50) }),
    ], hoy)
    expect(orden.map((x) => x.nombre)).toEqual([
      'Montar ya', 'Preparar', 'Espera contenido', 'Sin fecha',
    ])
  })

  it('dentro de la misma urgencia, primero lo que abre antes', () => {
    const orden = ordenarParaPreparar([
      item({ aperturaId: 1, nombre: 'Segunda', aperturaInscripcion: enDias(15) }),
      item({ aperturaId: 2, nombre: 'Primera', aperturaInscripcion: enDias(2) }),
    ], hoy)
    expect(orden.map((x) => x.nombre)).toEqual(['Primera', 'Segunda'])
  })

  it('con la misma fecha, alfabético', () => {
    const orden = ordenarParaPreparar([
      item({ aperturaId: 1, nombre: 'Zeta', aperturaInscripcion: enDias(5) }),
      item({ aperturaId: 2, nombre: 'Alfa', aperturaInscripcion: enDias(5) }),
    ], hoy)
    expect(orden.map((x) => x.nombre)).toEqual(['Alfa', 'Zeta'])
  })

  it('no modifica la lista original', () => {
    const original = [item({ nombre: 'B' }), item({ nombre: 'A', aperturaInscripcion: enDias(1) })]
    ordenarParaPreparar(original, hoy)
    expect(original[0].nombre).toBe('B')
  })
})

describe('contarPorUrgencia', () => {
  it('agrupa para el resumen', () => {
    const cuenta = contarPorUrgencia([
      item({ estado: 'finalizacion', aperturaInscripcion: enDias(5) }),
      item({ estado: 'maquetacion', aperturaInscripcion: enDias(10) }),
      item({ estado: 'construccion', aperturaInscripcion: enDias(5) }),
      item({ aperturaInscripcion: null }),
    ], hoy)
    expect(cuenta).toEqual({
      'montar-ya': 2, preparar: 0, 'esperando-contenido': 1, 'sin-fecha': 1,
    })
  })
})
