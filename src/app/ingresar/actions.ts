'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verificarContrasena } from '@/lib/contrasenas'
import { iniciarSesion } from '@/lib/sesion'
import { estaBloqueado, minutosRestantes, trasIntentoFallido, trasIngresoExitoso } from '@/lib/limite-ingreso'

export async function entrarConCredenciales(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const contrasena = String(formData.get('contrasena') ?? '')

  const u = await prisma.usuario.findUnique({ where: { email } })

  if (!u || !u.activo) redirect('/ingresar?error=credenciales')
  if (!u.passwordHash) redirect('/ingresar?error=sin-contrasena')

  const ahora = new Date()

  // Bloqueado de una tanda anterior: ni siquiera se prueba la contraseña,
  // para que no sirva de nada haber acertado justo durante la espera.
  if (estaBloqueado(u, ahora)) {
    redirect(`/ingresar?error=bloqueado&minutos=${minutosRestantes(u.bloqueadoHasta!, ahora)}`)
  }

  if (!verificarContrasena(contrasena, u.passwordHash)) {
    const siguiente = trasIntentoFallido(u, ahora)
    await prisma.usuario.update({ where: { id: u.id }, data: siguiente })

    if (siguiente.bloqueadoHasta) {
      redirect(`/ingresar?error=bloqueado&minutos=${minutosRestantes(siguiente.bloqueadoHasta, ahora)}`)
    }
    redirect('/ingresar?error=credenciales')
  }

  await prisma.usuario.update({ where: { id: u.id }, data: trasIngresoExitoso() })
  await iniciarSesion(email)
  redirect('/')
}
