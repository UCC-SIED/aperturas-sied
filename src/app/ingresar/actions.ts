'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verificarContrasena } from '@/lib/contrasenas'
import { iniciarSesion } from '@/lib/sesion'

export async function entrarConCredenciales(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const contrasena = String(formData.get('contrasena') ?? '')

  const u = await prisma.usuario.findUnique({ where: { email } })

  if (!u || !u.activo) redirect('/ingresar?error=credenciales')
  if (!u.passwordHash) redirect('/ingresar?error=sin-contrasena')
  if (!verificarContrasena(contrasena, u.passwordHash)) redirect('/ingresar?error=credenciales')

  await iniciarSesion(email)
  redirect('/')
}
