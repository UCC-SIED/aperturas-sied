import { describe, it, expect } from 'vitest'
import { estadoPeriodo } from '@/lib/estado-periodo'

const hoy = new Date(2026, 7, 13) // 13/08/2026

describe('estadoPeriodo', () => {
  it('todavía no empieza el cursado: próximo', () => {
    expect(estadoPeriodo(new Date(2027, 2, 1), new Date(2027, 3, 1), hoy)).toBe('proximo')
  })

  it('ya empezó y no llegó al cierre: en curso', () => {
    expect(estadoPeriodo(new Date(2026, 7, 12), new Date(2026, 9, 12), hoy)).toBe('en_curso')
  })

  it('ya pasó el cierre: cerrado', () => {
    expect(estadoPeriodo(new Date(2025, 7, 12), new Date(2025, 9, 12), hoy)).toBe('cerrado')
  })

  it('sin fecha de cierre cargada, ya empezado: se asume en curso', () => {
    expect(estadoPeriodo(new Date(2026, 0, 1), null, hoy)).toBe('en_curso')
  })

  it('empieza justo hoy: en curso, no próximo', () => {
    expect(estadoPeriodo(hoy, new Date(2026, 9, 1), hoy)).toBe('en_curso')
  })

  it('cierra justo hoy: todavía en curso, no cerrado', () => {
    expect(estadoPeriodo(new Date(2026, 6, 1), hoy, hoy)).toBe('en_curso')
  })
})
