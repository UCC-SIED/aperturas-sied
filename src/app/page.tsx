import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  // Quien planifica entra directo a lo que tiene que decidir; el resto, a la foto general.
  redirect(s.rol === 'director' || s.rol === 'unidad' ? '/planificar' : '/panel')
}
