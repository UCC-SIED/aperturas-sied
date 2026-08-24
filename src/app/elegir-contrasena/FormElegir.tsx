'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoAlerta } from '@/components/iconos'
import { elegir, type EstadoElegir } from './actions'

const ESTADO_INICIAL: EstadoElegir = { error: null }

export function FormElegir() {
  const [estado, accion] = useActionState(elegir, ESTADO_INICIAL)

  return (
    <form action={accion} className="form-ingreso">
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      <CampoContrasena
        id="contrasena"
        name="contrasena"
        label="Contraseña nueva"
        autoComplete="new-password"
      />
      <CampoContrasena
        id="repetir"
        name="repetir"
        label="Repetila"
        autoComplete="new-password"
      />
      <Boton className="boton-principal" enCurso="Guardando">Guardar y entrar</Boton>
    </form>
  )
}
