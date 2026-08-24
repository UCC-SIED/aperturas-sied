import { describe, it, expect, afterEach } from 'vitest'
import { casillaSied } from '@/lib/email'

const POR_DEFECTO = 'tecnologia.sied@ucc.edu.ar'

describe('casilla a la que va el aviso', () => {
  const original = process.env.SIED_EMAIL

  afterEach(() => {
    if (original === undefined) delete process.env.SIED_EMAIL
    else process.env.SIED_EMAIL = original
  })

  it('sin configurar nada, va a la casilla del equipo SIED', () => {
    delete process.env.SIED_EMAIL
    expect(casillaSied()).toBe(POR_DEFECTO)
  })

  it('se puede apuntar a otra dirección para probar el envío', () => {
    process.env.SIED_EMAIL = 'prueba@ejemplo.com'
    expect(casillaSied()).toBe('prueba@ejemplo.com')
  })

  // Una variable declarada pero vacía es más fácil de dejar por accidente que
  // de escribir a propósito: si mandara a '', el aviso se perdería sin aviso.
  it('una variable vacía o en blanco no pisa el valor por defecto', () => {
    process.env.SIED_EMAIL = '   '
    expect(casillaSied()).toBe(POR_DEFECTO)
  })
})
