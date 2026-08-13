'use client'

import { useState } from 'react'
import { TIPOS_POR_UNIDAD } from '@/lib/validar'

const TIPO_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  cuatrimestral: 'Cuatrimestral',
}

/**
 * El tipo de período depende de la unidad (Posgrado sólo mensual; Educación
 * sólo bimestral/cuatrimestral) — filtra las opciones para que no se pueda
 * ni intentar la combinación inválida.
 */
export function SelectorUnidadTipo({ unidades }: { unidades: { id: string; nombre: string }[] }) {
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? '')
  const tipos = TIPOS_POR_UNIDAD[unidadId] ?? []

  return (
    <>
      <label htmlFor="unidadId">
        Unidad
        <select
          id="unidadId"
          name="unidadId"
          value={unidadId}
          onChange={(e) => setUnidadId(e.target.value)}
        >
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </label>
      <label htmlFor="tipo">
        Tipo
        <select id="tipo" name="tipo" key={unidadId} defaultValue={tipos[0]}>
          {tipos.map((t) => (
            <option key={t} value={t}>{TIPO_LABELS[t] ?? t}</option>
          ))}
        </select>
      </label>
    </>
  )
}
