/**
 * Iconos dibujados, de trazo uniforme (1.5px, esquinas redondeadas), tomados
 * del set de Lucide. Sin emoji: no son consistentes entre sistemas ni se
 * pueden teñir con el color del contexto.
 */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

/** Varios nodos conectados: la asignatura que comparten varias carreras. */
export function IconoCompartida() {
  return (
    <svg {...base} className="icono">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  )
}

/** Reloj: algo pendiente o con fecha encima. */
export function IconoTiempo() {
  return (
    <svg {...base} className="icono">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

/** Logotipo de Google, con sus colores oficiales. */
export function IconoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false" className="icono">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

/** Hoja de cálculo: la exportación. */
export function IconoDescarga() {
  return (
    <svg {...base} className="icono">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

/** Ojo abierto: mostrar la contraseña escrita. */
export function IconoOjo() {
  return (
    <svg {...base} className="icono">
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Ojo tachado: volver a ocultarla. */
export function IconoOjoTachado() {
  return (
    <svg {...base} className="icono">
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c4.64 0 8.34 2.9 9.94 6.65a1 1 0 0 1 0 .7 15.9 15.9 0 0 1-2.2 3.53M6.6 6.6A15.9 15.9 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.66 16.1 7.36 19 12 19c1.9 0 3.63-.49 5.1-1.3" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
    </svg>
  )
}

/** Flecha con tope: el aviso de Bloq Mayús activado. */
export function IconoMayusculas() {
  return (
    <svg {...base} className="icono">
      <path d="M14.5 3.5 20 9a1 1 0 0 1-.7 1.7H16v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3H4.7A1 1 0 0 1 4 9l5.5-5.5a3.5 3.5 0 0 1 5 0" />
      <rect x="8" y="18" width="8" height="3" rx="1" />
    </svg>
  )
}

/** Triángulo de atención: algo salió mal y hay que leerlo. */
export function IconoAlerta() {
  return (
    <svg {...base} className="icono">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

/** Candado cerrado: la marca de la pantalla de ingreso. */
export function IconoCandado() {
  return (
    <svg {...base} className="icono">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/** Lupa: buscar dentro de una lista larga. */
export function IconoBuscar() {
  return (
    <svg {...base} className="icono">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/** Puerta con flecha: cerrar la sesión. */
export function IconoSalir() {
  return (
    <svg {...base} className="icono">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}
