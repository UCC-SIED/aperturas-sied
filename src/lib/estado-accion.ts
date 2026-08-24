/**
 * Lo que devuelve una acción de servidor cuando puede fallar por un motivo
 * esperable: falta un dato, no hay permiso, ya existe algo con ese nombre.
 * Vive separado de `accion.ts` porque lo importan tanto acciones de servidor
 * como componentes de cliente, y un componente de cliente no puede importar
 * nada de un archivo `'use server'`.
 */
export type EstadoAccion = { error: string | null }

export const SIN_ERROR: EstadoAccion = { error: null }
