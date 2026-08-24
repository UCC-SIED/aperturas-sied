'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { registrarPedido } from '@/lib/pedidos'
import { enviarAvisoPedido } from '@/lib/email'

export type EstadoPedido = { error: string | null }

async function origen() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${h.get('host')}`
}

/**
 * Deja el pedido y avisa al equipo SIED, que lo resuelve a mano.
 *
 * El aviso por correo es best-effort a propósito: el pedido ya quedó en la
 * base, que es lo que mira administración. Si Resend no está configurado o se
 * cae, el fallo va al log del servidor y no a la cara de alguien que no puede
 * hacer nada al respecto — antes veía el error crudo "falta RESEND_API_KEY" y
 * quedaba creyendo que no había pedido nada.
 *
 * Nunca revela si el correo existe: la pantalla dice lo mismo en los dos casos.
 */
export async function solicitarPedido(
  _prevState: EstadoPedido,
  formData: FormData,
): Promise<EstadoPedido> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) return { error: 'Ingresá tu correo' }

  const usuario = await registrarPedido(email)

  if (usuario) {
    try {
      await enviarAvisoPedido(usuario.nombre, usuario.email, `${await origen()}/admin`)
    } catch (e) {
      console.error('No se pudo avisar del pedido de contraseña:', e)
    }
  }

  redirect('/recuperar?enviado=1')
}
