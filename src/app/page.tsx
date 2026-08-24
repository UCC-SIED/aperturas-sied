import { redirect } from 'next/navigation'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const s = await exigirSesion()
  // Quien planifica entra directo a lo que tiene que decidir; el resto, a la foto general.
  redirect(s.rol === 'director' || s.rol === 'unidad' ? '/planificar' : '/panel')
}
