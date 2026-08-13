import { describe, it, expect } from 'vitest'
import { parseDocentes, joinDocentes } from '@/lib/docentes'

describe('parseDocentes', () => {
  it('separa por barra', () => {
    expect(parseDocentes('Silvia Fontana/ Virginia Escañuela')).toEqual([
      'Silvia Fontana', 'Virginia Escañuela',
    ])
  })

  it('un solo nombre queda igual', () => {
    expect(parseDocentes('Viviana Arias')).toEqual(['Viviana Arias'])
  })

  it('la coma no separa: es el formato "Apellido, Nombre" de una sola persona', () => {
    expect(parseDocentes('Sánchez, Gabriel Leandro')).toEqual(['Sánchez, Gabriel Leandro'])
  })

  it('ignora espacios y entradas vacías', () => {
    expect(parseDocentes('Ana Paz /  / Juan Ruiz')).toEqual(['Ana Paz', 'Juan Ruiz'])
  })

  it('texto vacío da lista vacía', () => {
    expect(parseDocentes('')).toEqual([])
    expect(parseDocentes('   ')).toEqual([])
  })

  it('no repite el mismo nombre dos veces', () => {
    expect(parseDocentes('Ana Paz / Ana Paz')).toEqual(['Ana Paz'])
  })
})

describe('joinDocentes', () => {
  it('junta con " / "', () => {
    expect(joinDocentes(['Ana Paz', 'Juan Ruiz'])).toBe('Ana Paz / Juan Ruiz')
  })

  it('lista vacía da texto vacío', () => {
    expect(joinDocentes([])).toBe('')
  })
})
