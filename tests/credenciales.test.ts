import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

const EMAIL = 'credenciales.test@ucc.edu.ar'

describe('marca de contraseña por elegir', () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('un usuario nuevo arranca con la marca puesta', async () => {
    const u = await prisma.usuario.create({
      data: { email: EMAIL, nombre: '__TEST__', rol: 'consulta' },
    })
    expect(u.debeElegirContrasena).toBe(true)
  })
})
