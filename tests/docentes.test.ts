import { describe, it, expect } from 'vitest'
import { parseDocentes, joinDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'

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

describe('mismoGrupoDeDocentes', () => {
  it('el mismo grupo en el mismo orden es igual', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Ana Paz', 'Juan Ruiz'])).toBe(true)
  })

  it('el mismo grupo en otro orden también es igual', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Juan Ruiz', 'Ana Paz'])).toBe(true)
  })

  it('agregar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz'], ['Ana Paz', 'Juan Ruiz'])).toBe(false)
  })

  it('sacar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Ana Paz'])).toBe(false)
  })

  it('renombrar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz'], ['Ana Paza'])).toBe(false)
  })

  it('dos listas vacías son el mismo grupo (nadie)', () => {
    expect(mismoGrupoDeDocentes([], [])).toBe(true)
  })
})
