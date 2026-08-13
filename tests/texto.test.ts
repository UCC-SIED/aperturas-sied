import { describe, it, expect } from 'vitest'
import { normalizarBusqueda } from '@/lib/texto'

describe('normalizarBusqueda', () => {
  it('ignora mayusculas y minusculas', () => {
    expect(normalizarBusqueda('LUCIA')).toBe(normalizarBusqueda('lucia'))
  })

  it('busqueda sin acento encuentra texto con acento', () => {
    expect(normalizarBusqueda('lucia')).toBe(normalizarBusqueda('Lucía'))
  })

  it('normaliza varios acentos y la enie', () => {
    expect(normalizarBusqueda('María José Núñez')).toBe('maria jose nunez')
  })

  it('recorta espacios de los bordes', () => {
    expect(normalizarBusqueda('  Ana  ')).toBe('ana')
  })
})
