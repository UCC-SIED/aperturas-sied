'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Pantallas que se muestran solas: sin barra ni navegación detrás. Son las
 * de antes de tener sesión, donde la barra sólo ofrece enlaces que van a
 * rebotar al ingreso.
 */
const SIN_MARCO = ['/ingresar', '/recuperar', '/elegir-contrasena']

function suelta(pathname: string): boolean {
  return SIN_MARCO.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

/** Barra superior. Desaparece en las pantallas que se muestran solas. */
export function BarraSuperior({ children }: { children: React.ReactNode }) {
  if (suelta(usePathname())) return null
  return <header className="topbar">{children}</header>
}

/**
 * Enlace de la navegación que se marca cuando estás parado en esa sección.
 * Sin esto no hay forma de saber en qué pantalla estás: todas se ven igual.
 */
export function EnlaceNav({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const activo = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link href={href} className={activo ? 'activo' : undefined} aria-current={activo ? 'page' : undefined}>
      {children}
    </Link>
  )
}

export function Contenido({ children }: { children: React.ReactNode }) {
  return (
    <div id="contenido" className={suelta(usePathname()) ? 'contenido pleno' : 'contenido'}>
      {children}
    </div>
  )
}
