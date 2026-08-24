import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { registrarPedido, sellarPedidos, pedidosPendientes } from '@/lib/pedidos'

const ACTIVO = 'pedido.activo@ucc.edu.ar'
const BAJA = 'pedido.baja@ucc.edu.ar'
const OTRO = 'pedido.otro@ucc.edu.ar'

async function usuario(email: string, activo = true) {
  return prisma.usuario.upsert({
    where: { email },
    update: { activo },
    create: { email, nombre: `__TEST__ ${email}`, rol: 'consulta', activo },
  })
}

async function pendientesDe(usuarioId: number) {
  return prisma.pedidoContrasena.findMany({ where: { usuarioId, resuelto: null } })
}

describe('pedidos de contraseña', () => {
  beforeEach(async () => {
    // Los pedidos se borran en cascada al borrar el usuario.
    await prisma.usuario.deleteMany({ where: { email: { in: [ACTIVO, BAJA, OTRO] } } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { in: [ACTIVO, BAJA, OTRO] } } })
    await prisma.$disconnect()
  })

  it('registra el pedido de un usuario activo y devuelve a quién avisar', async () => {
    const u = await usuario(ACTIVO)
    const resultado = await registrarPedido(ACTIVO)

    expect(resultado).toEqual({ id: u.id, nombre: u.nombre, email: ACTIVO })
    expect(await pendientesDe(u.id)).toHaveLength(1)
  })

  it('normaliza el correo antes de buscarlo', async () => {
    const u = await usuario(ACTIVO)
    const resultado = await registrarPedido(`  ${ACTIVO.toUpperCase()} `)

    expect(resultado?.id).toBe(u.id)
  })

  it('no registra nada si el correo no existe, y no lo revela', async () => {
    const resultado = await registrarPedido('no.existe.en.absoluto@ucc.edu.ar')

    expect(resultado).toBeNull()
  })

  it('no registra nada si el usuario está dado de baja', async () => {
    const u = await usuario(BAJA, false)
    const resultado = await registrarPedido(BAJA)

    expect(resultado).toBeNull()
    expect(await pendientesDe(u.id)).toHaveLength(0)
  })

  it('pedir dos veces deja un solo pendiente, con la fecha actualizada', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    const [primero] = await pendientesDe(u.id)

    await registrarPedido(ACTIVO)
    const despues = await pendientesDe(u.id)

    expect(despues).toHaveLength(1)
    expect(despues[0].id).toBe(primero.id)
    expect(despues[0].creado.getTime()).toBeGreaterThanOrEqual(primero.creado.getTime())
  })

  it('un pedido resuelto no bloquea uno nuevo', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    await sellarPedidos(u.id)
    await registrarPedido(ACTIVO)

    expect(await pendientesDe(u.id)).toHaveLength(1)
    expect(await prisma.pedidoContrasena.count({ where: { usuarioId: u.id } })).toBe(2)
  })

  it('sellar cierra los pendientes de ese usuario y no los de otro', async () => {
    const uno = await usuario(ACTIVO)
    const otro = await usuario(OTRO)
    await registrarPedido(ACTIVO)
    await registrarPedido(OTRO)

    await sellarPedidos(uno.id)

    expect(await pendientesDe(uno.id)).toHaveLength(0)
    expect(await pendientesDe(otro.id)).toHaveLength(1)
  })

  it('sellar dos veces no rompe', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    await sellarPedidos(u.id)
    await sellarPedidos(u.id)

    expect(await pendientesDe(u.id)).toHaveLength(0)
  })

  it('lista los pendientes con su usuario, el más viejo primero', async () => {
    const uno = await usuario(ACTIVO)
    const otro = await usuario(OTRO)
    await registrarPedido(ACTIVO)
    await registrarPedido(OTRO)

    const lista = await pedidosPendientes()
    const mios = lista.filter((p) => [uno.id, otro.id].includes(p.usuarioId))

    expect(mios).toHaveLength(2)
    expect(mios[0].usuarioId).toBe(uno.id)
    expect(mios[0].usuario.email).toBe(ACTIVO)
  })
})
