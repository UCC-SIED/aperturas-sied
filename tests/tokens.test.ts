import { describe, it, expect } from 'vitest'
import { generarToken, hashToken } from '@/lib/tokens'

describe('tokens de recuperación', () => {
  it('genera tokens distintos cada vez, de suficiente longitud', () => {
    const a = generarToken()
    const b = generarToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
  })

  it('el hash es determinístico y distinto entre tokens', () => {
    const token = generarToken()
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toBe(hashToken(generarToken()))
  })
})
