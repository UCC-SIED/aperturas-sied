'use server'

import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'
import { elegirPrimeraContrasena } from '@/lib/credenciales'

export type EstadoElegir = { error: string | null }

/**
 * Usa sesionActual() y no exigirSesion(): exigirSesion redirige justamente acá,
 * así que se llamaría a sí misma en un bucle.
 */
export async function elegir(
  _prevState: EstadoElegir,
  formData: FormData,
): Promise<EstadoElegir> {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  // La pantalla ya filtra por la marca (page.tsx redirige si no está puesta),
  // pero una server action se puede disparar sin pasar por ahí: alguien con
  // una sesión ajena abierta podría fijarle una contraseña nueva sin conocer
  // la actual. Repetir el chequeo acá es la segunda puerta que evita eso.
  if (!s.debeElegirContrasena) redirect('/')

  const nueva = String(formData.get('contrasena') ?? '')
  const repetir = String(formData.get('repetir') ?? '')
  if (nueva !== repetir) return { error: 'Las dos contraseñas no coinciden' }

  const { error } = await elegirPrimeraContrasena(s.id, nueva)
  if (error) return { error }

  redirect('/')
}
