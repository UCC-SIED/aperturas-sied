'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoAlerta } from '@/components/iconos'
import { cambiarMiContrasena, type EstadoPerfil } from './actions'

const ESTADO_INICIAL: EstadoPerfil = { error: null, listo: false }

export function FormPerfil() {
  const [estado, accion] = useActionState(cambiarMiContrasena, ESTADO_INICIAL)

  return (
    <form action={accion} className="ficha">
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      {estado.listo && (
        <p className="mensaje-ok" role="status">
          Listo, tu contraseña nueva ya está activa.
        </p>
      )}
      <CampoContrasena
        id="actual"
        name="actual"
        label="Tu contraseña actual"
        autoComplete="current-password"
      />
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
      <Boton enCurso="Guardando">Cambiar mi contraseña</Boton>
    </form>
  )
}
