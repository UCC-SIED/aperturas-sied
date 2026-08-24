'use client'

import { useActionState } from 'react'
import { IconoAlerta } from '@/components/iconos'
import { type EstadoAccion, SIN_ERROR } from '@/lib/estado-accion'

export type { EstadoAccion }

/**
 * Envuelve un formulario cuya acción puede fallar por un motivo esperable
 * —falta un dato, no hay permiso, ya existe algo con ese nombre— y muestra
 * ese motivo en la propia pantalla.
 *
 * Sin esto, esa acción lanzaba una excepción y Next la reemplazaba por un
 * mensaje genérico en producción (para no filtrar detalles de errores que sí
 * son inesperados): la persona se quedaba sin saber qué corregir. Acá el
 * error viaja como dato en vez de como excepción, así que llega intacto.
 */
export function FormConError({
  action,
  className,
  children,
}: {
  /** La acción, con sus argumentos propios ya aplicados vía `.bind(null, …)`. */
  action: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>
  className?: string
  children: React.ReactNode
}) {
  const [estado, accion] = useActionState(action, SIN_ERROR)

  return (
    <form action={accion} className={className}>
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      {children}
    </form>
  )
}
