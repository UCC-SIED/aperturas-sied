import type { EstadoAccion } from './estado-accion'

/**
 * Envuelve el cuerpo de una acción de servidor para que un error esperado
 * —falta un permiso, un dato inválido, algo que ya no existe— llegue al
 * formulario como el valor que muestra `FormConError`, en vez de como una
 * excepción.
 *
 * Sin esto, Next reemplaza el mensaje de la excepción por uno genérico en
 * producción, para no filtrar accidentalmente el detalle de un error que sí
 * sea inesperado: la persona se quedaba sin saber qué corregir. Acá el
 * `throw new Error(...)` que ya tenía cada acción sigue funcionando igual,
 * sólo que se atrapa en el borde y viaja como dato.
 *
 * `redirect()` y `notFound()` de Next funcionan lanzando una excepción propia
 * para cortar el render: no son errores y hay que dejarlos pasar tal cual.
 */
export async function comoResultado(cuerpo: () => Promise<void>): Promise<EstadoAccion> {
  try {
    await cuerpo()
    return { error: null }
  } catch (e) {
    if (esControlDeNext(e)) throw e
    return { error: e instanceof Error ? e.message : 'Ocurrió un problema inesperado.' }
  }
}

function esControlDeNext(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && 'digest' in e &&
    typeof (e as { digest: unknown }).digest === 'string' &&
    (e as { digest: string }).digest.startsWith('NEXT_')
  )
}
