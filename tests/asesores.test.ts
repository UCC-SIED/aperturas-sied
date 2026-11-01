import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { resolverAsesor } from '@/lib/asesores'

describe('resolverAsesor', () => {
  async function limpiar() {
    await prisma.asignatura.updateMany({ data: { asesorId: null } })
    await prisma.asesor.deleteMany({})
  }
  beforeAll(limpiar)
  afterAll(async () => { await limpiar(); await prisma.$disconnect() })

  it('texto vacío o null no crea nada y devuelve null', async () => {
    expect(await resolverAsesor(prisma, null)).toBeNull()
    expect(await resolverAsesor(prisma, '')).toBeNull()
    expect(await resolverAsesor(prisma, '   ')).toBeNull()
  })

  it('crea un asesor nuevo y devuelve su id', async () => {
    const id = await resolverAsesor(prisma, 'Gonzalo Dalto')
    const a = await prisma.asesor.findUnique({ where: { id: id! } })
    expect(a?.nombre).toBe('Gonzalo Dalto')
    expect(a?.claveNormalizada).toBe('gonzalo dalto')
  })

  it('un nombre con distinto casing/espacios resuelve a la misma persona', async () => {
    const primero = await resolverAsesor(prisma, 'Victoria Coria')
    const segundo = await resolverAsesor(prisma, '  victoria   coria  ')
    expect(segundo).toBe(primero)
    expect(await prisma.asesor.count({ where: { claveNormalizada: 'victoria coria' } })).toBe(1)
  })
})
