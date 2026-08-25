import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from './db'
import { auth } from '@/auth'
import type { Sesion } from './permisos'

const COOKIE = 'aperturas_usuario'

/**
 * Sin Google, la cookie es la única prueba de quién es cada uno: hay que
 * firmarla para que nadie pueda escribir el correo de otra persona a mano y
 * entrar como esa persona. `AUTH_SECRET` ya es la variable que documenta el
 * proyecto para cuando se configure Google, así que hace doble uso.
 */
function secreto(): string {
  const s = process.env.AUTH_SECRET
  if (!s) {
    throw new Error(
      'Falta la variable AUTH_SECRET: sin ella no se puede firmar la sesión de forma segura.',
    )
  }
  return s
}

function firmar(email: string): string {
  const firma = createHmac('sha256', secreto()).update(email).digest('base64url')
  return `${Buffer.from(email, 'utf8').toString('base64url')}.${firma}`
}

/** El correo si la firma es válida, o null si la cookie fue manipulada o quedó de un formato viejo. */
function verificar(valor: string): string | null {
  const [emailB64, firma] = valor.split('.')
  if (!emailB64 || !firma) return null

  let email: string
  try {
    email = Buffer.from(emailB64, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const esperada = Buffer.from(createHmac('sha256', secreto()).update(email).digest('base64url'))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  return email
}

/** Con Google configurado, la identidad sale de ahí y no del selector local. */
export function googleActivo(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}

/**
 * Quién está usando el sistema.
 *
 * Cuando Google está configurado, el correo lo da el proveedor. Si no —en
 * desarrollo, o antes de terminar de configurarlo— se elige en /ingresar y
 * viaja en una cookie. El resto del sistema no distingue entre los dos casos:
 * lee el rol y las carreras de la base en cada pedido, así un cambio de
 * permisos tiene efecto sin necesidad de volver a iniciar sesión.
 */
export async function sesionActual(): Promise<Sesion | null> {
  const email = googleActivo()
    ? (await auth())?.user?.email?.toLowerCase()
    : verificar((await cookies()).get(COOKIE)?.value ?? '')

  if (!email) return null

  const u = await prisma.usuario.findUnique({
    where: { email },
    include: { carreras: true },
  })
  if (!u || !u.activo) return null

  // El rol "unidad" no tiene carreras asignadas una por una: planifica todas
  // las que haya en su unidad, incluida cualquiera que se sume después.
  const carreraIds = u.rol === 'unidad' && u.unidadId
    ? (await prisma.carrera.findMany({ where: { unidadId: u.unidadId }, select: { id: true } })).map((c) => c.id)
    : u.carreras.map((c) => c.carreraId)

  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    carreraIds,
    debeElegirContrasena: u.debeElegirContrasena,
  }
}

/** Sólo se usa en el modo local sin Google. */
export async function iniciarSesion(email: string) {
  ;(await cookies()).set(COOKIE, firmar(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function cerrarSesion() {
  ;(await cookies()).delete(COOKIE)
}

/**
 * La sesión de alguien que puede usar el sistema. Si no puede, no vuelve.
 *
 * El chequeo va acá y no en el layout raíz a propósito: los layouts del App
 * Router no se reejecutan al navegar del lado del cliente, así que un guardia
 * ahí no correría en cada cambio de ruta. Ver la guía de autenticación de Next
 * en node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export async function exigirSesion(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (s.debeElegirContrasena) redirect('/elegir-contrasena')
  return s
}

/**
 * Lo mismo para usar dentro de una server action, que se puede disparar sin
 * pasar por ninguna pantalla. Lanza en vez de redirigir, que es el patrón de
 * las acciones de este proyecto: las recoge src/app/error.tsx.
 */
export async function exigirSesionActiva(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) throw new Error('Tenés que ingresar de nuevo')
  if (s.debeElegirContrasena) {
    throw new Error('Antes de seguir tenés que elegir una contraseña propia')
  }
  return s
}
