'use client'

import { useId, useState } from 'react'

/**
 * Cada docente es su propio chip, con una X para sacarlo; agregar uno nuevo
 * es escribirlo aparte y confirmarlo, no reescribir toda la lista. Por
 * debajo sigue viajando como un único campo de texto (mismo formato de
 * siempre, separado por "/"), así el guardado del lado del servidor no
 * necesita saber que esto es una lista.
 *
 * `catalogo` (opcional) son los nombres ya cargados en el catálogo de
 * docentes: aparecen como sugerencia nativa del navegador al tipear, para
 * empujar a reusar el nombre exacto de alguien que ya existe en vez de
 * escribirlo de nuevo con otra ortografía. Sigue siendo texto libre — quien
 * carga puede escribir un nombre nuevo igual, no está bloqueado.
 */
export function EditorDocentes({
  name,
  iniciales,
  etiqueta,
  catalogo = [],
}: {
  name: string
  iniciales: string[]
  etiqueta: string
  catalogo?: string[]
}) {
  const [docentes, setDocentes] = useState(iniciales)
  const [nuevo, setNuevo] = useState('')
  const idCatalogo = useId()

  function agregar() {
    const limpio = nuevo.trim()
    if (limpio && !docentes.includes(limpio)) setDocentes([...docentes, limpio])
    setNuevo('')
  }

  // Si queda algo tipeado sin confirmar con Enter o "+", Guardar tiene que
  // llevárselo igual — quien lo escribió no espera que desaparezca en silencio.
  const pendiente = nuevo.trim()
  const aGuardar = pendiente && !docentes.includes(pendiente) ? [...docentes, pendiente] : docentes

  return (
    <div className="editor-docentes">
      <input type="hidden" name={name} value={aGuardar.join(' / ')} />
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
          list={catalogo.length ? idCatalogo : undefined}
        />
        <button type="button" onClick={agregar} aria-label={`Confirmar docente para ${etiqueta}`}>
          +
        </button>
      </div>
      {catalogo.length > 0 && (
        <datalist id={idCatalogo}>
          {catalogo.map((n) => <option key={n} value={n} />)}
        </datalist>
      )}
    </div>
  )
}
