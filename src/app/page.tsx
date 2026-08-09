import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  // El SIED arranca en la foto general; los directores, en su planificador.
  redirect(s.rol === 'sied' ? '/periodos' : '/planificar')
}
