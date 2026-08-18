'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeAdministrar, esCorreoInstitucional, ROLES } from '@/lib/permisos'
import { hashContrasena } from '@/lib/contrasenas'

const CONTRASENA_MINIMA = 8

async function exigirAdmin() {
  const s = await sesionActual()
  if (!puedeAdministrar(s)) throw new Error('Sólo administración puede gestionar usuarios')
  return s!
}

async function anotar(usuarioId: number, detalle: string) {
  await prisma.cambio.create({ data: { usuarioId, accion: 'gestion_usuarios', detalle } })
}

export async function crearUsuario(formData: FormData) {
  const admin = await exigirAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const rol = String(formData.get('rol') ?? '')
  const contrasena = String(formData.get('contrasena') ?? '')

  if (!esCorreoInstitucional(email)) {
    throw new Error('El correo tiene que ser del dominio de la universidad (@ucc.edu.ar)')
  }
  if (!nombre) throw new Error('Poné el nombre de la persona o del área')
  if (!(ROLES as readonly string[]).includes(rol)) throw new Error('Rol inválido')
  if (contrasena.length < CONTRASENA_MINIMA) {
    throw new Error(`La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres`)
  }

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) throw new Error(`Ya existe un usuario con el correo ${email}`)

  await prisma.usuario.create({ data: { email, nombre, rol, passwordHash: hashContrasena(contrasena) } })
  await anotar(admin.id, `Alta de usuario: ${nombre} (${email}) como ${rol}`)
  revalidatePath('/admin')
}

export async function establecerContrasena(usuarioId: number, formData: FormData) {
  const admin = await exigirAdmin()
  const contrasena = String(formData.get('contrasena') ?? '')
  if (contrasena.length < CONTRASENA_MINIMA) {
    throw new Error(`La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres`)
  }

  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) throw new Error('Usuario inexistente')

  await prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: hashContrasena(contrasena) } })
  await anotar(admin.id, `${u.nombre}: se le definió una contraseña nueva`)
  revalidatePath('/admin')
}

export async function cambiarRol(usuarioId: number, formData: FormData) {
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
}

export async function alternarActivo(usuarioId: number) {
  const admin = await exigirAdmin()
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) throw new Error('Usuario inexistente')
  if (u.id === admin.id) throw new Error('No podés darte de baja a vos mismo')

  await prisma.usuario.update({ where: { id: usuarioId }, data: { activo: !u.activo } })
  await anotar(admin.id, `${u.nombre}: ${u.activo ? 'baja' : 'alta'} de acceso`)
  revalidatePath('/admin')
}

export async function asignarCarreras(usuarioId: number, formData: FormData) {
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
}

/** Sólo para rol "unidad": qué unidad académica planifica entera. */
export async function asignarUnidad(usuarioId: number, formData: FormData) {
  const admin = await exigirAdmin()
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) throw new Error('Usuario inexistente')

  const unidadId = String(formData.get('unidadId') ?? '') || null
  const unidad = unidadId ? await prisma.unidad.findUnique({ where: { id: unidadId } }) : null
  if (unidadId && !unidad) throw new Error('Unidad inexistente')

  await prisma.usuario.update({ where: { id: usuarioId }, data: { unidadId } })
  await anotar(admin.id, `${u.nombre}: unidad → ${unidad?.nombre ?? 'ninguna'}`)
  revalidatePath('/admin')
}
