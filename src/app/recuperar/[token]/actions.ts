'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { hashContrasena } from '@/lib/contrasenas'
import { hashToken } from '@/lib/tokens'
import { iniciarSesion } from '@/lib/sesion'

const CONTRASENA_MINIMA = 8

export type EstadoContrasena = { error: string | null }

export async function restablecerContrasena(
  token: string,
  _prevState: EstadoContrasena,
  formData: FormData,
): Promise<EstadoContrasena> {
  const contrasena = String(formData.get('contrasena') ?? '')
  if (contrasena.length < CONTRASENA_MINIMA) {
    return { error: `La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres` }
  }

  const reinicio = await prisma.reinicioContrasena.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: true },
  })
  if (!reinicio || reinicio.usado || reinicio.expira < new Date() || !reinicio.usuario.activo) {
    redirect('/recuperar?vencido=1')
  }

  await prisma.usuario.update({
    where: { id: reinicio.usuarioId },
    data: { passwordHash: hashContrasena(contrasena) },
  })
  // De paso, cualquier otro link de recuperación pendiente para esta cuenta queda inválido.
  await prisma.reinicioContrasena.updateMany({
    where: { usuarioId: reinicio.usuarioId, usado: false },
    data: { usado: true },
  })

  await iniciarSesion(reinicio.usuario.email)
  redirect('/')
}
