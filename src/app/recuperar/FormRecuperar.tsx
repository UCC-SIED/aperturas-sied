'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { IconoAlerta } from '@/components/iconos'
import { solicitarPedido, type EstadoPedido } from './actions'

const ESTADO_INICIAL: EstadoPedido = { error: null }

export function FormRecuperar() {
  const [estado, accion] = useActionState(solicitarPedido, ESTADO_INICIAL)

  return (
    <form action={accion} className="form-ingreso">
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      <div className="campo">
        <label htmlFor="email">Correo institucional</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="alguien@ucc.edu.ar"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <Boton className="boton-principal" enCurso="Enviando">Pedir contraseña nueva</Boton>
    </form>
  )
}
