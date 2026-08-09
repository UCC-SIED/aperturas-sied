import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aperturas SIED',
  description: 'Gestión de aperturas de aulas en Canvas — SIED UCC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <span className="marca">Aperturas SIED</span>
          <nav>
            <Link href="/periodos">Períodos</Link>
            <Link href="/asignaturas">Asignaturas</Link>
            <Link href="/produccion">Producción</Link>
          </nav>
        </header>
        <div className="contenido">{children}</div>
      </body>
    </html>
  )
}
