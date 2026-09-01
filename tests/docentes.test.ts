import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { parseDocentes, joinDocentes, mismoGrupoDeDocentes, normalizarNombre, resolverDocentes } from '@/lib/docentes'

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

describe('normalizarNombre', () => {
  it('baja a minúsculas', () => {
    expect(normalizarNombre('Juan Pérez')).toBe('juan pérez')
  })

  it('saca espacios de los extremos', () => {
    expect(normalizarNombre('  Juan Pérez  ')).toBe('juan pérez')
  })

  it('junta espacios repetidos', () => {
    expect(normalizarNombre('Juan   Pérez')).toBe('juan pérez')
  })
})

describe('resolverDocentes', () => {
  async function limpiar() {
    await prisma.docente.deleteMany({})
  }
  beforeAll(limpiar)
  afterAll(async () => { await limpiar(); await prisma.$disconnect() })

  it('crea un docente nuevo y devuelve su id', async () => {
    const [id] = await resolverDocentes(prisma, ['Ana Paz'])
    const d = await prisma.docente.findUnique({ where: { id } })
    expect(d?.nombre).toBe('Ana Paz')
    expect(d?.claveNormalizada).toBe('ana paz')
  })

  it('un nombre con distinto casing/espacios resuelve a la misma persona', async () => {
    const [primero] = await resolverDocentes(prisma, ['Juan Ruiz'])
    const [segundo] = await resolverDocentes(prisma, ['  juan   ruiz  '])
    expect(segundo).toBe(primero)
    expect(await prisma.docente.count({ where: { claveNormalizada: 'juan ruiz' } })).toBe(1)
  })

  it('devuelve los ids en el mismo orden que los nombres pedidos', async () => {
    const [idPaz] = await resolverDocentes(prisma, ['Ana Paz'])
    const [idRuiz] = await resolverDocentes(prisma, ['Juan Ruiz'])
    const ids = await resolverDocentes(prisma, ['Juan Ruiz', 'Ana Paz'])
    expect(ids).toEqual([idRuiz, idPaz])
  })
})
