'use client'

import { useEffect, useRef } from 'react'

const ESPERA_MS = 400

/**
 * Buscador que filtra solo mientras se escribe (con una pausa corta para no
 * recargar letra por letra) y al instante si se vacía — sin depender de
 * Enter ni de un botón. Devuelve el foco y el cursor al campo después de
 * cada recarga, para que escribir se sienta continuo.
 */
export function BuscadorAutoLimpia(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null)
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const el = ref.current
    if (el && el.value) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  return (
    <input
      {...props}
      ref={ref}
      onChange={(e) => {
        const form = e.currentTarget.form
        const valor = e.currentTarget.value
        if (espera.current) clearTimeout(espera.current)
        if (valor.trim() === '') {
          form?.requestSubmit()
          return
        }
        espera.current = setTimeout(() => form?.requestSubmit(), ESPERA_MS)
      }}
    />
  )
}
