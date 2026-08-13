'use client'

/**
 * Un <select> que manda el formulario apenas cambia, sin esperar a que
 * aprieten el botón — para filtros donde elegir ya es la intención de filtrar.
 */
export function SelectAutoSubmit(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit()
      }}
    />
  )
}
