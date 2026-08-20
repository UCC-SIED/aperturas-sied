'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoAlerta } from '@/components/iconos'
import { restablecerContrasena, type EstadoContrasena } from './actions'

const ESTADO_INICIAL: EstadoContrasena = { error: null }

export function FormRestablecer({ token }: { token: string }) {
  const [estado, accion] = useActionState(restablecerContrasena.bind(null, token), ESTADO_INICIAL)

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
      <Boton className="boton-principal" enCurso="Guardando">Guardar y entrar</Boton>
    </form>
  )
}
