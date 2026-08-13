'use client'

/**
 * Un buscador de texto: escribir y confirmar sigue siendo con Enter (no
 * queremos recargar la página en cada letra), pero vaciarlo aplica al toque
 * — si ya no dice nada, no tiene sentido esperar a que confirmen para
 * volver a mostrar todo.
 */
export function BuscadorAutoLimpia(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      onChange={(e) => {
        if (e.currentTarget.value.trim() === '') {
          e.currentTarget.form?.requestSubmit()
        }
      }}
    />
  )
}
