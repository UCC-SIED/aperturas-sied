import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { verificarContrasena, hashContrasena } from '@/lib/contrasenas'
import {
  CONTRASENA_MINIMA,
  generarProvisoria,
  elegirPrimeraContrasena,
  cambiarContrasenaPropia,
} from '@/lib/credenciales'

const EMAIL = 'credenciales.test@ucc.edu.ar'
const ACTUAL = 'la-de-antes-2026'

async function usuario(passwordHash: string | null = hashContrasena(ACTUAL)) {
  return prisma.usuario.create({
    data: { email: EMAIL, nombre: '__TEST__', rol: 'consulta', passwordHash },
  })
}

async function leer(id: number) {
  return prisma.usuario.findUniqueOrThrow({ where: { id } })
}

describe('provisoria generada', () => {
  it('tiene el formato palabra-palabra-palabra-NNN', () => {
    expect(generarProvisoria()).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{3}$/)
  })

  // Sin tildes ni ñ: se dicta por teléfono y se tipea en cualquier teclado.
  it('no trae tildes ni ñ', () => {
    for (let i = 0; i < 50; i++) {
      expect(generarProvisoria()).not.toMatch(/[áéíóúüñ]/)
    }
  })

  it('dos llamadas seguidas no coinciden', () => {
    expect(generarProvisoria()).not.toBe(generarProvisoria())
  })

  it('es más larga que el mínimo exigido', () => {
    expect(generarProvisoria().length).toBeGreaterThanOrEqual(CONTRASENA_MINIMA)
  })
})

describe('elegir la primera contraseña', () => {
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('guarda el hash, baja la marca y anota en la bitácora', async () => {
    const u = await usuario()
    const { error } = await elegirPrimeraContrasena(u.id, 'la-mia-propia-2026')

    expect(error).toBeNull()
    const despues = await leer(u.id)
    expect(despues.debeElegirContrasena).toBe(false)
    expect(verificarContrasena('la-mia-propia-2026', despues.passwordHash)).toBe(true)

    const anotado = await prisma.cambio.findFirst({
      where: { usuarioId: u.id },
      orderBy: { fecha: 'desc' },
    })
    expect(anotado?.detalle).toContain('__TEST__')
  })

  it('rechaza una contraseña corta sin tocar la base', async () => {
    const u = await usuario()
    const { error } = await elegirPrimeraContrasena(u.id, 'corta')

    expect(error).toContain(String(CONTRASENA_MINIMA))
    const despues = await leer(u.id)
    expect(despues.debeElegirContrasena).toBe(true)
    expect(verificarContrasena(ACTUAL, despues.passwordHash)).toBe(true)
  })

  it('no explota si el usuario no existe', async () => {
    const { error } = await elegirPrimeraContrasena(999999, 'la-mia-propia-2026')
    expect(error).toBeTruthy()
  })
})

describe('cambiar la contraseña propia', () => {
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('funciona si la actual coincide', async () => {
    const u = await usuario()
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'la-nueva-mia-2026')

    expect(error).toBeNull()
    const despues = await leer(u.id)
    expect(verificarContrasena('la-nueva-mia-2026', despues.passwordHash)).toBe(true)
    expect(despues.debeElegirContrasena).toBe(false)
  })

  // Lo que evita que alguien que encuentre una sesión abierta se apropie de la cuenta.
  it('falla si la actual no coincide, y no toca el hash guardado', async () => {
    const u = await usuario()
    const antes = (await leer(u.id)).passwordHash
    const { error } = await cambiarContrasenaPropia(u.id, 'no-es-esta', 'la-nueva-mia-2026')

    expect(error).toBeTruthy()
    expect((await leer(u.id)).passwordHash).toBe(antes)
  })

  it('falla si el usuario no tiene contraseña definida', async () => {
    const u = await usuario(null)
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'la-nueva-mia-2026')
    expect(error).toBeTruthy()
  })

  it('rechaza una contraseña corta sin tocar la base', async () => {
    const u = await usuario()
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'corta')

    expect(error).toContain(String(CONTRASENA_MINIMA))
    expect(verificarContrasena(ACTUAL, (await leer(u.id)).passwordHash)).toBe(true)
  })
})
