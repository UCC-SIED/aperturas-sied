'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconoMenu, IconoCerrar } from '@/components/iconos'

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

/**
 * En pantallas angostas, la navegación y la sesión no entran junto a la
 * marca — antes quedaban recortadas y sólo se llegaba a ellas deslizando la
 * barra de costado, sin ningún indicio de que eso fuera posible. Este botón
 * las junta en un panel desplegable; en pantallas anchas no cambia nada, el
 * CSS lo mantiene invisible y el panel siempre abierto.
 */
export function MenuMobil({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const pathname = usePathname()

  // Al navegar a otra pantalla el menú se cierra solo: si no, quedaba
  // tapando la pantalla nueva hasta que alguien lo cerraba a mano.
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  return (
    <>
      <button
        type="button"
        className="boton-menu"
        aria-expanded={abierto}
        aria-controls="panel-menu"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? <IconoCerrar /> : <IconoMenu />}
      </button>
      <div id="panel-menu" className={abierto ? 'panel-menu abierto' : 'panel-menu'}>
        {children}
      </div>
    </>
  )
}

export function Contenido({ children }: { children: React.ReactNode }) {
  return (
    <div id="contenido" className={suelta(usePathname()) ? 'contenido pleno' : 'contenido'}>
      {children}
    </div>
  )
}
