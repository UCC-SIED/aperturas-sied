import { cookies } from 'next/headers'
import { prisma } from './db'
import { auth } from '@/auth'
import type { Sesion } from './permisos'

const COOKIE = 'aperturas_usuario'

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
    : (await cookies()).get(COOKIE)?.value

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
  }
}

/** Sólo se usa en el modo local sin Google. */
export async function iniciarSesion(email: string) {
  ;(await cookies()).set(COOKIE, email, {
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
