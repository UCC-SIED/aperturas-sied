import type { PedidoContrasena, Usuario } from '@prisma/client'
import { prisma } from './db'

/**
 * Registra un pedido de contraseña y devuelve a quién hay que avisarle, o
 * `null` cuando el correo no corresponde a nadie que pueda entrar.
 *
 * Quien llama tiene que responder lo mismo en los dos casos: si la pantalla
 * distinguiera, cualquiera podría averiguar qué direcciones están dadas de
 * alta probándolas de una en una.
 */
export async function registrarPedido(
  email: string,
): Promise<{ id: number; nombre: string; email: string } | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, nombre: true, email: true, activo: true },
  })
  if (!usuario || !usuario.activo) return null

  // Un solo pendiente por usuario: pedir de nuevo corre la fecha en lugar de
  // apilar filas, así la lista de /admin no se llena de repetidos ni se puede
  // inflar apretando el botón en repetición.
  const pendiente = await prisma.pedidoContrasena.findFirst({
    where: { usuarioId: usuario.id, resuelto: null },
  })

  if (pendiente) {
    await prisma.pedidoContrasena.update({
      where: { id: pendiente.id },
      data: { creado: new Date() },
    })
  } else {
    await prisma.pedidoContrasena.create({ data: { usuarioId: usuario.id } })
  }

  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
}

/**
 * Cierra los pedidos pendientes de alguien. Idempotente: se llama tanto al
 * fijarle una contraseña como al descartar el pedido a mano, y llamarla de
 * más no hace nada.
 */
export async function sellarPedidos(usuarioId: number): Promise<void> {
  await prisma.pedidoContrasena.updateMany({
    where: { usuarioId, resuelto: null },
    data: { resuelto: new Date() },
  })
}

/** Lo que ve administración: lo pendiente, lo que espera desde más tiempo primero. */
export async function pedidosPendientes(): Promise<(PedidoContrasena & { usuario: Usuario })[]> {
  return prisma.pedidoContrasena.findMany({
    where: { resuelto: null },
    include: { usuario: true },
    orderBy: { creado: 'asc' },
  })
}
