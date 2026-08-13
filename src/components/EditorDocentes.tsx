'use client'

import { useState } from 'react'

/**
 * Cada docente es su propio chip, con una X para sacarlo; agregar uno nuevo
 * es escribirlo aparte y confirmarlo, no reescribir toda la lista. Por
 * debajo sigue viajando como un único campo de texto (mismo formato de
 * siempre, separado por "/"), así el guardado del lado del servidor no
 * necesita saber que esto es una lista.
 */
export function EditorDocentes({
  name,
  iniciales,
  etiqueta,
}: {
  name: string
  iniciales: string[]
  etiqueta: string
}) {
  const [docentes, setDocentes] = useState(iniciales)
  const [nuevo, setNuevo] = useState('')

  function agregar() {
    const limpio = nuevo.trim()
    if (limpio && !docentes.includes(limpio)) setDocentes([...docentes, limpio])
    setNuevo('')
  }

  return (
    <div className="editor-docentes">
      <input type="hidden" name={name} value={docentes.join(' / ')} />
      {docentes.length > 0 && (
        <ul className="chips-docentes">
          {docentes.map((d) => (
            <li key={d}>
              <span>{d}</span>
              <button
                type="button"
                onClick={() => setDocentes(docentes.filter((x) => x !== d))}
                aria-label={`Quitar a ${d} de ${etiqueta}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="agregar-docente">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          placeholder="Agregar docente…"
          aria-label={`Agregar docente a ${etiqueta}`}
        />
        <button type="button" onClick={agregar} aria-label={`Confirmar docente para ${etiqueta}`}>
          +
        </button>
      </div>
    </div>
  )
}
