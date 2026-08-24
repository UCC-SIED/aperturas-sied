import { Resend } from 'resend'

/**
 * El único correo que manda el sistema va a la casilla del equipo SIED, que es
 * la dueña de la API key de Resend. Eso es lo que lo hace viable: el remitente
 * de prueba `onboarding@resend.dev` sólo entrega ahí, así que no hace falta
 * verificar el dominio institucional en DNS. Por eso el sistema no le escribe
 * a los usuarios: no les llegaría.
 */
const CASILLA_SIED = 'tecnologia.sied@ucc.edu.ar'

const REMITENTE =
  process.env.RESEND_FROM_EMAIL || 'Gestión de Asignaturas SIED <onboarding@resend.dev>'

export function emailActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/** El nombre lo tipeó una persona en /admin: puede traer < o &. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function enviarAvisoPedido(
  nombre: string,
  email: string,
  linkAdmin: string,
): Promise<void> {
  if (!emailActivo()) {
    throw new Error('El envío de correo no está configurado (falta RESEND_API_KEY)')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: CASILLA_SIED,
    subject: `Pedido de contraseña — ${nombre}`,
    html: `
      <p><strong>${escapar(nombre)}</strong> (${escapar(email)}) no puede entrar y pidió
      una contraseña nueva.</p>
      <p><a href="${escapar(linkAdmin)}">Resolverlo en Administración</a></p>
      <p>Fijale una contraseña ahí y avisale por fuera del sistema.</p>
    `,
  })
  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`)
}
