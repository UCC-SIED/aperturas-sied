/**
 * Minusculas y sin acentos, para que buscar "lucia" encuentre "Lucia" (con
 * acento) -- un acento de mas o de menos no tiene por que romper una busqueda.
 */
export function normalizarBusqueda(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
