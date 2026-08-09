export function inferirPeriodo(
  inicioCursado: Date,
  periodos: { id: number; inicioCursado: Date }[],
  toleranciaDias = 10,
): number | null {
  let mejor: { id: number; dist: number } | null = null
  for (const p of periodos) {
    const dist = Math.abs(p.inicioCursado.getTime() - inicioCursado.getTime()) / 86_400_000
    if (dist <= toleranciaDias && (!mejor || dist < mejor.dist)) mejor = { id: p.id, dist }
  }
  return mejor?.id ?? null
}
