'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * El botón, más el aviso de que el guardado terminó.
 *
 * `useFormStatus` sólo se puede leer desde un hijo del `<form>`, así que el
 * aviso sube por callback: la barra necesita saberlo para dejar de decir que
 * hay cambios pendientes.
 */
function Boton({ alTerminar }: { alTerminar: () => void }) {
  const { pending } = useFormStatus()
  const estabaGuardando = useRef(false)

  useEffect(() => {
    if (pending) {
      estabaGuardando.current = true
      return
    }
    // Sólo cuenta como "terminó" si antes había empezado: si no, esto se
    // dispararía en el primer render y en cada re-render de la pantalla.
    if (estabaGuardando.current) {
      estabaGuardando.current = false
      alTerminar()
    }
  }, [pending, alTerminar])

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
 *
 * Al terminar el guardado la marca se baja. Sin eso la barra quedaba ámbar
 * para siempre y el navegador seguía preguntando si querés salir, incluso
 * después de haber guardado: parecía que el guardado no había funcionado.
 */
export function BarraGuardar({ nota }: { nota: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [sucio, setSucio] = useState(false)
  const limpiar = useCallback(() => setSucio(false), [])

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
      <Boton alTerminar={limpiar} />
      <span className="nota">
        {sucio ? <strong className="pendiente">Hay cambios sin guardar.</strong> : null} {nota}
      </span>
    </div>
  )
}
