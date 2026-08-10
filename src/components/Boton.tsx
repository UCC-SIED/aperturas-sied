'use client'

import { useFormStatus } from 'react-dom'

/**
 * Botón de envío que se deshabilita mientras el formulario está en curso.
 * Sin esto, un doble clic manda la acción dos veces y no hay señal de que
 * algo esté pasando: en el planificador eso significa aperturas duplicadas.
 */
export function Boton({
  children,
  enCurso,
  className,
  ...props
}: {
  children: React.ReactNode
  /** Texto mientras se procesa. Por defecto, el mismo con puntos suspensivos. */
  enCurso?: string
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className} {...props}>
      {pending ? (enCurso ?? '…') : children}
    </button>
  )
}
