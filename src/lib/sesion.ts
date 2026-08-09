import { cookies } from 'next/headers'
import { prisma } from './db'
import type { Sesion } from './permisos'

const COOKIE = 'aperturas_usuario'

/**
 * Sesión actual. Hoy la identidad se elige en /ingresar y viaja en una cookie;
 * cuando entre Google OAuth sólo cambia de dónde sale el email — todo lo que
 * consume esta función (permisos, filtros por carrera, historial) queda igual.
 */
export async function sesionActual(): Promise<Sesion | null> {
  const email = (await cookies()).get(COOKIE)?.value
  if (!email) return null
  const u = await prisma.usuario.findUnique({
    where: { email },
    include: { carreras: true },
  })
  if (!u || !u.activo) return null
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    carreraIds: u.carreras.map((c) => c.carreraId),
  }
}

export async function iniciarSesion(email: string) {
  ;(await cookies()).set(COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function cerrarSesion() {
  ;(await cookies()).delete(COOKIE)
}
