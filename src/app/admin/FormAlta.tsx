'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { IconoAlerta } from '@/components/iconos'
import { crearUsuario, type EstadoAlta } from './actions'

const ESTADO_INICIAL: EstadoAlta = { error: null }

export function FormAlta({ roles }: { roles: { valor: string; etiqueta: string }[] }) {
  const [estado, accion] = useActionState(crearUsuario, ESTADO_INICIAL)

  return (
    <>
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}

      {estado.provisoria && (
        <div className="provisoria" role="status">
          <p>
            <strong>{estado.nombre}</strong> ya está dada de alta. Pasale esta contraseña,
            que sirve una sola vez: al entrar va a tener que elegir la suya.
          </p>
          <code>{estado.provisoria}</code>
          <p className="nota">
            No queda guardada en ningún lado. Si cerrás esta pantalla sin copiarla, hay que
            generarle una nueva desde la columna Contraseña de la tabla de abajo.
          </p>
        </div>
      )}

      <form action={accion} className="ficha alta-usuario">
        <label htmlFor="nombre">
          Nombre
          <input id="nombre" name="nombre" required />
        </label>
        <label htmlFor="email">
          Correo institucional
          <input id="email" name="email" type="email" placeholder="alguien@ucc.edu.ar" required />
        </label>
        <label htmlFor="rol">
          Rol
          <select id="rol" name="rol" defaultValue="director">
            {roles.map((r) => (
              <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
            ))}
          </select>
        </label>
        <Boton enCurso="Dando de alta">Dar de alta</Boton>
      </form>
    </>
  )
}
