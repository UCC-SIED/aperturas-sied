import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  // Los directores entran directo a lo que tienen que decidir; el resto, a la foto general.
  redirect(s.rol === 'director' ? '/planificar' : '/panel')
}
