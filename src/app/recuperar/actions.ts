'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { generarToken, hashToken } from '@/lib/tokens'
import { enviarCorreoRecuperacion } from '@/lib/email'

const VIGENCIA_HORAS = 2

async function origen() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${h.get('host')}`
}

/**
 * Nunca revela si el correo existe o no: la pantalla dice lo mismo en los
 * dos casos, para no darle a cualquiera una forma de chequear qué cuentas
 * están dadas de alta.
 */
export async function solicitarRecuperacion(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) throw new Error('Ingresá tu correo')

  const u = await prisma.usuario.findUnique({ where: { email } })
  if (u && u.activo) {
    const token = generarToken()
    await prisma.reinicioContrasena.create({
      data: {
        usuarioId: u.id,
        tokenHash: hashToken(token),
        expira: new Date(Date.now() + VIGENCIA_HORAS * 60 * 60 * 1000),
      },
    })
    const link = `${await origen()}/recuperar/${token}`
    await enviarCorreoRecuperacion(email, link)
  }

  redirect('/recuperar?enviado=1')
}
