import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sesionActual, cerrarSesion, googleActivo } from '@/lib/sesion'
import { signOut } from '@/auth'
import { ROL_LABELS, puedeAdministrar } from '@/lib/permisos'
import { BarraSuperior, EnlaceNav, Contenido, MenuMobil } from '@/components/Marco'
import { IconoSalir } from '@/components/iconos'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Gestión de Asignaturas SIED',
    template: '%s · Gestión SIED',
  },
  description: 'Aperturas de aulas y seguimiento de producción en Canvas — SIED UCC',
}

async function salir() {
  'use server'
  if (googleActivo()) {
    await signOut({ redirectTo: '/ingresar' })
    return
  }
  await cerrarSesion()
  redirect('/ingresar')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await sesionActual()
  return (
    <html lang="es">
      <body>
        <a className="saltar-al-contenido" href="#contenido">Saltar al contenido</a>
        <BarraSuperior>
          <Link href="/" className="marca">Gestión SIED</Link>
          <MenuMobil>
            {s && (
              <nav aria-label="Secciones">
                <EnlaceNav href="/panel">Panel</EnlaceNav>
                {s.rol !== 'consulta' && <EnlaceNav href="/planificar">Planificar</EnlaceNav>}
                <EnlaceNav href="/periodos">Períodos</EnlaceNav>
                <EnlaceNav href="/asignaturas">Asignaturas</EnlaceNav>
                {(s.rol === 'sied' || s.rol === 'admin') && (
                  <>
                    <EnlaceNav href="/produccion">Producción</EnlaceNav>
                    <EnlaceNav href="/preparar">Aulas a preparar</EnlaceNav>
                  </>
                )}
                {puedeAdministrar(s) && <EnlaceNav href="/admin">Administración</EnlaceNav>}
              </nav>
            )}
            {s ? (
              <div className="sesion">
                <Link href="/perfil" className="quien" title="Mi cuenta">
                  <span className="inicial" aria-hidden>{s.nombre.trim().charAt(0).toUpperCase()}</span>
                  <span className="nombre">{s.nombre}</span>
                  <span className="rol">{ROL_LABELS[s.rol] ?? s.rol}</span>
                </Link>
                <form action={salir}>
                  <button type="submit" title="Cerrar sesión">
                    <IconoSalir />
                    <span>Salir</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="sesion">
                <Link href="/ingresar" className="entrar">Ingresar</Link>
              </div>
            )}
          </MenuMobil>
        </BarraSuperior>
        <Contenido>{children}</Contenido>
      </body>
    </html>
  )
}
