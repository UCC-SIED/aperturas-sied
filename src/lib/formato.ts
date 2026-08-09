export function fmtFecha(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
