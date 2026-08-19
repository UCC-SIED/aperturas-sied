'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

function Boton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Guardando cambios' : 'Guardar cambios'}
    </button>
  )
}

/**
 * Barra de guardado de la tabla de seguimiento. La tabla se edita celda por
 * celda y nada se guarda hasta apretar el botón: si alguien cambia veinte
 * estados y se va a otra pantalla, pierde todo sin enterarse. Acá se avisa
 * que hay cambios pendientes y se intercepta la salida.
 */
export function BarraGuardar({ nota }: { nota: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [sucio, setSucio] = useState(false)

  useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return
    const ensuciar = () => setSucio(true)
    form.addEventListener('input', ensuciar)
    form.addEventListener('change', ensuciar)
    return () => {
      form.removeEventListener('input', ensuciar)
      form.removeEventListener('change', ensuciar)
    }
  }, [])

  useEffect(() => {
    if (!sucio) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sucio])

  return (
    <div ref={ref} className={`barra-guardar ${sucio ? 'con-cambios' : ''}`}>
      <Boton />
      <span className="nota">
        {sucio ? <strong className="pendiente">Hay cambios sin guardar.</strong> : null} {nota}
      </span>
    </div>
  )
}
