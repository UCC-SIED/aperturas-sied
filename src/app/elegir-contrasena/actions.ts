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

  const nueva = String(formData.get('contrasena') ?? '')
  const repetir = String(formData.get('repetir') ?? '')
  if (nueva !== repetir) return { error: 'Las dos contraseñas no coinciden' }

  const { error } = await elegirPrimeraContrasena(s.id, nueva)
  if (error) return { error }

  redirect('/')
}
