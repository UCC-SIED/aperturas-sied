import { describe, it, expect } from 'vitest'
import { inferirPeriodo } from '@/lib/inferir-periodo'

const periodos = [
  { id: 1, inicioCursado: new Date(2025, 4, 7) },   // 07/05/25
  { id: 2, inicioCursado: new Date(2025, 7, 6) },   // 06/08/25
  { id: 3, inicioCursado: new Date(2025, 9, 8) },   // 08/10/25
]

describe('inferirPeriodo', () => {
  it('empareja fecha exacta', () => {
    expect(inferirPeriodo(new Date(2025, 7, 6), periodos)).toBe(2)
  })
  it('empareja fecha cercana (06/05 vs 07/05)', () => {
    expect(inferirPeriodo(new Date(2025, 4, 6), periodos)).toBe(1)
  })
  it('devuelve null si nada está a menos de la tolerancia', () => {
    expect(inferirPeriodo(new Date(2025, 0, 15), periodos)).toBeNull()
  })
  it('elige el más cercano si hay dos candidatos', () => {
    const juntos = [
      { id: 1, inicioCursado: new Date(2026, 2, 1) },
      { id: 2, inicioCursado: new Date(2026, 2, 9) },
    ]
    expect(inferirPeriodo(new Date(2026, 2, 3), juntos)).toBe(1)
  })
})
