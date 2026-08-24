'use server'

import { exigirSesionActiva } from '@/lib/sesion'
import { cambiarContrasenaPropia } from '@/lib/credenciales'

export type EstadoPerfil = { error: string | null; listo: boolean }

export async function cambiarMiContrasena(
  _prevState: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const s = await exigirSesionActiva()

  const actual = String(formData.get('actual') ?? '')
  const nueva = String(formData.get('contrasena') ?? '')
  const repetir = String(formData.get('repetir') ?? '')

  if (nueva !== repetir) return { error: 'Las dos contraseñas nuevas no coinciden', listo: false }

  const { error } = await cambiarContrasenaPropia(s.id, actual, nueva)
  if (error) return { error, listo: false }

  // Sin redirect: quedarse en la pantalla con el aviso de que salió bien es más
  // claro que aparecer en otro lugar sin saber si se guardó.
  return { error: null, listo: true }
}
