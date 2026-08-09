import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'
import { cerrarSesion } from '@/lib/sesion'
import { ROL_LABELS } from '@/lib/permisos'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aperturas SIED',
  description: 'Gestión de aperturas de aulas en Canvas — SIED UCC',
}

async function salir() {
  'use server'
  await cerrarSesion()
  redirect('/ingresar')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await sesionActual()
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <span className="marca">Aperturas SIED</span>
          {s && (
            <nav>
              <Link href="/panel">Panel</Link>
              {s.rol !== 'consulta' && <Link href="/planificar">Planificar</Link>}
              <Link href="/periodos">Períodos</Link>
              <Link href="/asignaturas">Asignaturas</Link>
              {s.rol === 'sied' && <Link href="/produccion">Producción</Link>}
            </nav>
          )}
          {s ? (
            <div className="sesion">
              <span className="quien">{s.nombre}</span>
              <span className="rol">{ROL_LABELS[s.rol] ?? s.rol}</span>
              <form action={salir}>
                <button type="submit">Salir</button>
              </form>
            </div>
          ) : (
            <div className="sesion">
              <Link href="/ingresar" style={{ color: '#fff' }}>Ingresar</Link>
            </div>
          )}
        </header>
        <div className="contenido">{children}</div>
      </body>
    </html>
  )
}
