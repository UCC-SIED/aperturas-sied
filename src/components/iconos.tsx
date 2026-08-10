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

/** Hoja de cálculo: la exportación. */
export function IconoDescarga() {
  return (
    <svg {...base} className="icono">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}
