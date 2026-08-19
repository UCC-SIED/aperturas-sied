import { ESTADO_LABELS, type Estado } from '@/lib/estados'

/**
 * El estado de producción en forma de sello con color. En una tabla de
 * doscientas filas, "Finalizada" y "Sin novedad" en texto plano se confunden;
 * el color deja ver de un vistazo dónde está trabada la producción.
 */
export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`estado-badge est-${estado}`}>
      {ESTADO_LABELS[estado as Estado] ?? estado}
    </span>
  )
}
