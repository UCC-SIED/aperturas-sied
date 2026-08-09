import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

describe('base de datos', () => {
  afterAll(async () => {
    await prisma.carrera.deleteMany({ where: { nombre: '__TEST__' } })
    await prisma.unidad.deleteMany({ where: { id: '__test__' } })
    await prisma.$disconnect()
  })

  it('crea y lee una carrera con su unidad', async () => {
    await prisma.unidad.upsert({
      where: { id: '__test__' },
      update: {},
      create: { id: '__test__', nombre: 'Test' },
    })
    const c = await prisma.carrera.create({
      data: { nombre: '__TEST__', unidadId: '__test__' },
    })
    const leida = await prisma.carrera.findUnique({ where: { id: c.id } })
    expect(leida?.nombre).toBe('__TEST__')
  })
})
