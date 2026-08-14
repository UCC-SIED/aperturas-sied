import { describe, it, expect } from 'vitest'
import { hashContrasena, verificarContrasena } from '@/lib/contrasenas'

describe('hashContrasena / verificarContrasena', () => {
  it('una contraseña correcta verifica bien', () => {
    const hash = hashContrasena('miClave123')
    expect(verificarContrasena('miClave123', hash)).toBe(true)
  })

  it('una contraseña incorrecta no verifica', () => {
    const hash = hashContrasena('miClave123')
    expect(verificarContrasena('otraClave', hash)).toBe(false)
  })

  it('nunca guarda la contraseña en texto plano', () => {
    const hash = hashContrasena('miClave123')
    expect(hash).not.toContain('miClave123')
  })

  it('dos hashes de la misma contraseña son distintos (sal distinta)', () => {
    const a = hashContrasena('miClave123')
    const b = hashContrasena('miClave123')
    expect(a).not.toBe(b)
    expect(verificarContrasena('miClave123', a)).toBe(true)
    expect(verificarContrasena('miClave123', b)).toBe(true)
  })

  it('sin hash guardado (cuenta sin contraseña todavía), no verifica', () => {
    expect(verificarContrasena('cualquiera', null)).toBe(false)
  })

  it('un hash con formato roto no verifica ni tira excepción', () => {
    expect(verificarContrasena('algo', 'texto-sin-formato')).toBe(false)
  })
})
