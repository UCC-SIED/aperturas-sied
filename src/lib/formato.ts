export function fmtFecha(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

export function fmtFechaHora(d: Date | null | undefined): string {
  return d
    ? d.toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'
}
