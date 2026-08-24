import { describe, it, expect } from 'vitest'
import { idNumerico } from '@/lib/rutas'

describe('el id que viene en la URL', () => {
  it('acepta un id normal', () => {
    expect(idNumerico('251')).toBe(251)
    expect(idNumerico('1')).toBe(1)
  })

  // El caso que traía la pantalla de error de base: /periodos/cualquiercosa.
  it('rechaza cualquier texto que no sea un número', () => {
    expect(idNumerico('cualquiercosa')).toBeNull()
    expect(idNumerico('12abc')).toBeNull()
    expect(idNumerico('')).toBeNull()
    expect(idNumerico(undefined)).toBeNull()
  })

  // Son números para JavaScript, pero ningún enlace de la aplicación los produce.
  it('rechaza lo que JavaScript convertiría igual', () => {
    expect(idNumerico('12.0')).toBeNull()
    expect(idNumerico('1e3')).toBeNull()
    expect(idNumerico(' 12 ')).toBeNull()
    expect(idNumerico('-4')).toBeNull()
    expect(idNumerico('+4')).toBeNull()
    expect(idNumerico('Infinity')).toBeNull()
    expect(idNumerico('0x10')).toBeNull()
  })

  it('rechaza el cero y lo que no entra en la columna', () => {
    expect(idNumerico('0')).toBeNull()
    expect(idNumerico('2147483647')).toBe(2147483647)
    expect(idNumerico('2147483648')).toBeNull()
    expect(idNumerico('99999999999999999999')).toBeNull()
  })
})
