'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeAdministrar, esCorreoInstitucional, ROLES } from '@/lib/permisos'
import { hashContrasena } from '@/lib/contrasenas'
import { sellarPedidos } from '@/lib/pedidos'
import { CONTRASENA_MINIMA, generarProvisoria } from '@/lib/credenciales'
import { comoResultado } from '@/lib/accion'
import type { EstadoAccion } from '@/lib/estado-accion'

async function exigirAdmin() {
  const s = await exigirSesionActiva()
  if (!puedeAdministrar(s)) throw new Error('Sólo administración puede gestionar usuarios')
  return s
}

async function anotar(usuarioId: number, detalle: string) {
  await prisma.cambio.create({ data: { usuarioId, accion: 'gestion_usuarios', detalle } })
}

export type EstadoAlta = { error: string | null; provisoria?: string; nombre?: string }

/**
 * Devuelve la provisoria en lugar de lanzar, porque hay que mostrarla una sola
 * vez en pantalla. No puede viajar en la URL: quedaría en el historial del
 * navegador y en los logs del servidor.
 */
export async function crearUsuario(
  _prevState: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const admin = await exigirAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const rol = String(formData.get('rol') ?? '')

  if (!esCorreoInstitucional(email)) {
    return { error: 'El correo tiene que ser del dominio de la universidad (@ucc.edu.ar)' }
  }
  if (!nombre) return { error: 'Poné el nombre de la persona o del área' }
  if (!(ROLES as readonly string[]).includes(rol)) return { error: 'Rol inválido' }

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) return { error: `Ya existe un usuario con el correo ${email}` }

  const provisoria = generarProvisoria()
  await prisma.usuario.create({
    // debeElegirContrasena queda en true por el valor por defecto del modelo.
    data: { email, nombre, rol, passwordHash: hashContrasena(provisoria) },
  })
  await anotar(admin.id, `Alta de usuario: ${nombre} (${email}) como ${rol}`)
  revalidatePath('/admin')

  return { error: null, provisoria, nombre }
}

export async function establecerContrasena(
  usuarioId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const contrasena = String(formData.get('contrasena') ?? '')
    if (contrasena.length < CONTRASENA_MINIMA) {
      throw new Error(`La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres`)
    }

    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!u) throw new Error('Usuario inexistente')

    await prisma.usuario.update({
      where: { id: usuarioId },
      // Vuelve a marcar: esta contraseña la eligió administración, así que tiene
      // que dejar de servir en cuanto la persona entre.
      data: { passwordHash: hashContrasena(contrasena), debeElegirContrasena: true },
    })
    // Fijarle la contraseña ES resolver el pedido: si hubiera que marcarlo
    // aparte, la lista se llenaría de pedidos ya atendidos.
    await sellarPedidos(usuarioId)
    await anotar(admin.id, `${u.nombre}: se le definió una contraseña nueva`)
    revalidatePath('/admin')
  })
}

export async function cambiarRol(
  usuarioId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const rol = String(formData.get('rol') ?? '')
    if (!(ROLES as readonly string[]).includes(rol)) throw new Error('Rol inválido')

    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!u) throw new Error('Usuario inexistente')
    if (u.id === admin.id && rol !== 'admin') {
      throw new Error('No podés quitarte a vos mismo el rol de administración')
    }

    const data: { rol: string; unidadId?: null } = { rol }
    // Un usuario que deja de ser director no conserva sus carreras puntuales,
    // y uno que deja de ser "unidad" no conserva la unidad que planificaba entera.
    if (rol !== 'director') {
      await prisma.usuarioCarrera.deleteMany({ where: { usuarioId } })
    }
    if (rol !== 'unidad') data.unidadId = null

    await prisma.usuario.update({ where: { id: usuarioId }, data })
    await anotar(admin.id, `${u.nombre}: rol ${u.rol} → ${rol}`)
    revalidatePath('/admin')
  })
}

export async function alternarActivo(
  usuarioId: number,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!u) throw new Error('Usuario inexistente')
    if (u.id === admin.id) throw new Error('No podés darte de baja a vos mismo')

    await prisma.usuario.update({ where: { id: usuarioId }, data: { activo: !u.activo } })
    await anotar(admin.id, `${u.nombre}: ${u.activo ? 'baja' : 'alta'} de acceso`)
    revalidatePath('/admin')
  })
}

export async function asignarCarreras(
  usuarioId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!u) throw new Error('Usuario inexistente')

    const ids = formData.getAll('carreraId').map(Number).filter(Boolean)

    await prisma.usuarioCarrera.deleteMany({ where: { usuarioId } })
    for (const carreraId of ids) {
      await prisma.usuarioCarrera.create({ data: { usuarioId, carreraId } })
    }

    const nombres = await prisma.carrera.findMany({ where: { id: { in: ids } } })
    await anotar(
      admin.id,
      `${u.nombre}: carreras → ${nombres.map((c) => c.nombre).join(', ') || 'ninguna'}`,
    )
    revalidatePath('/admin')
  })
}

/** Sólo para rol "unidad": qué unidad académica planifica entera. */
export async function asignarUnidad(
  usuarioId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!u) throw new Error('Usuario inexistente')

    const unidadId = String(formData.get('unidadId') ?? '') || null
    const unidad = unidadId ? await prisma.unidad.findUnique({ where: { id: unidadId } }) : null
    if (unidadId && !unidad) throw new Error('Unidad inexistente')

    await prisma.usuario.update({ where: { id: usuarioId }, data: { unidadId } })
    await anotar(admin.id, `${u.nombre}: unidad → ${unidad?.nombre ?? 'ninguna'}`)
    revalidatePath('/admin')
  })
}

/**
 * Cierra un pedido sin tocar la contraseña: para lo que no corresponda
 * atender, o cuando la persona ya se acomodó por otro lado.
 */
export async function descartarPedido(
  pedidoId: number,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const pedido = await prisma.pedidoContrasena.findUnique({
      where: { id: pedidoId },
      include: { usuario: true },
    })
    if (!pedido) throw new Error('Pedido inexistente')

    await sellarPedidos(pedido.usuarioId)
    await anotar(admin.id, `${pedido.usuario.nombre}: se descartó el pedido de contraseña`)
    revalidatePath('/admin')
  })
}
