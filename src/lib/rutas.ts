/**
 * Los ids que vienen en la URL son texto y pueden ser cualquier cosa: un
 * enlace viejo, una dirección escrita a mano, un robot probando direcciones.
 *
 * Si ese texto se pasa a la base tal cual, `Number('cualquiercosa')` da NaN y
 * Prisma corta con un error de esquema; la persona se encuentra con una
 * pantalla técnica en vez de un "no existe". Por eso el id se valida antes de
 * consultar y, si no es un id posible, la pantalla contesta que no encontró
 * nada, que es lo que realmente pasó.
 */

/** El id más grande que entra en una columna `Int` de Postgres. */
const MAXIMO = 2147483647

/**
 * El número que representa el texto, o null si no puede ser un id.
 *
 * Acepta sólo dígitos: nada de signos, decimales, espacios ni notación
 * científica. `'12.0'`, `'1e3'` y `' 12 '` son números para JavaScript pero
 * ninguno salió nunca de un enlace de la aplicación, así que no son ids.
 */
export function idNumerico(valor: string | undefined): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null
  const n = Number(valor)
  // El 0 no lo usa ninguna tabla, y más allá del máximo la propia base falla.
  if (n < 1 || n > MAXIMO) return null
  return n
}

/**
 * El texto de la URL listo para buscar, o null si viene mal armado.
 *
 * `decodeURIComponent` corta con una excepción ante un `%` suelto o una
 * secuencia incompleta, y esa excepción termina en la pantalla de error en vez
 * de en un "no encontramos esa página".
 */
export function textoDeRuta(valor: string | undefined): string | null {
  if (!valor) return null
  try {
    return decodeURIComponent(valor)
  } catch {
    return null
  }
}
