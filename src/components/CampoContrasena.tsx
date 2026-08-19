'use client'

import { useState } from 'react'
import { IconoOjo, IconoOjoTachado, IconoMayusculas } from './iconos'

/**
 * Campo de contraseña con dos ayudas que evitan el intento fallido más común:
 * poder leer lo que se escribió, y el aviso de Bloq Mayús —que es la causa
 * silenciosa de la mitad de los "correo o contraseña incorrectos".
 */
export function CampoContrasena({
  id = 'contrasena',
  name = 'contrasena',
  label = 'Contraseña',
  autoComplete = 'current-password',
  required = true,
}: {
  id?: string
  name?: string
  label?: string
  autoComplete?: string
  required?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [mayusculas, setMayusculas] = useState(false)

  function revisarMayusculas(e: React.KeyboardEvent<HTMLInputElement>) {
    setMayusculas(e.getModifierState?.('CapsLock') ?? false)
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      <div className="campo-contrasena">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          onKeyUp={revisarMayusculas}
          onKeyDown={revisarMayusculas}
          onBlur={() => setMayusculas(false)}
        />
        <button
          type="button"
          className="ver-contrasena"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
          <span>{visible ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>
      {mayusculas && (
        <p className="aviso-campo" role="status">
          <IconoMayusculas />
          Tenés activado Bloq Mayús.
        </p>
      )}
    </div>
  )
}
