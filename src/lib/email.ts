import { Resend } from 'resend'

/**
 * Mientras el dominio ucc.edu.ar no esté verificado en Resend, sólo se puede
 * mandar correo a la cuenta dueña de la API key — alcanza para probar el
 * flujo, pero para que le llegue a cualquier usuario hay que verificarlo
 * (ver README).
 */
const REMITENTE = process.env.RESEND_FROM_EMAIL || 'Gestión de Asignaturas SIED <onboarding@resend.dev>'

export function emailActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function enviarCorreoRecuperacion(destino: string, link: string) {
  if (!emailActivo()) {
    throw new Error('El envío de correo no está configurado (falta RESEND_API_KEY)')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: destino,
    subject: 'Recuperar contraseña — Gestión de Asignaturas SIED',
    html: `
      <p>Pediste recuperar tu contraseña en Gestión de Asignaturas SIED.</p>
      <p><a href="${link}">Elegir una contraseña nueva</a></p>
      <p>El link vale por 2 horas. Si no fuiste vos, ignorá este correo.</p>
    `,
  })
  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`)
}
