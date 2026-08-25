import { describe, it, expect } from 'vitest'
import {
  estaBloqueado, minutosRestantes, trasIntentoFallido, trasIngresoExitoso,
  type EstadoIntentos,
} from '@/lib/limite-ingreso'

const SIN_HISTORIAL: EstadoIntentos = { intentosFallidos: 0, nivelBloqueo: 0, bloqueadoHasta: null }
const ahora = new Date('2027-01-01T12:00:00')
const minutosDespues = (n: number) => new Date(ahora.getTime() + n * 60_000)

describe('los primeros cuatro fallos no bloquean', () => {
  it('sólo suma el contador', () => {
    let estado = SIN_HISTORIAL
    for (let i = 1; i <= 4; i++) {
      estado = trasIntentoFallido(estado, ahora)
      expect(estado.intentosFallidos).toBe(i)
      expect(estado.bloqueadoHasta).toBeNull()
    }
  })
})

describe('el quinto fallo seguido bloquea', () => {
  it('un minuto la primera vez', () => {
    let estado = SIN_HISTORIAL
    for (let i = 0; i < 5; i++) estado = trasIntentoFallido(estado, ahora)
    expect(estado.nivelBloqueo).toBe(1)
    expect(estado.intentosFallidos).toBe(0)
    expect(estaBloqueado(estado, ahora)).toBe(true)
    expect(estaBloqueado(estado, minutosDespues(1.5))).toBe(false)
  })

  it('cinco minutos la segunda vez, quince la tercera, y ahí se queda', () => {
    let estado = SIN_HISTORIAL
    for (let i = 0; i < 5; i++) estado = trasIntentoFallido(estado, ahora) // nivel 1: 1 min
    for (let i = 0; i < 5; i++) estado = trasIntentoFallido(estado, ahora) // nivel 2: 5 min
    expect(minutosRestantes(estado.bloqueadoHasta!, ahora)).toBe(5)

    for (let i = 0; i < 5; i++) estado = trasIntentoFallido(estado, ahora) // nivel 3: 15 min
    expect(minutosRestantes(estado.bloqueadoHasta!, ahora)).toBe(15)

    for (let i = 0; i < 5; i++) estado = trasIntentoFallido(estado, ahora) // nivel 4: sigue en 15
    expect(minutosRestantes(estado.bloqueadoHasta!, ahora)).toBe(15)
  })
})

describe('entrar bien borra todo', () => {
  it('vuelve como si nunca hubiera fallado', () => {
    expect(trasIngresoExitoso()).toEqual(SIN_HISTORIAL)
  })
})

describe('minutosRestantes', () => {
  it('redondea siempre para arriba, nunca da 0 con el bloqueo activo', () => {
    const bloqueadoHasta = new Date(ahora.getTime() + 30_000) // medio minuto
    expect(minutosRestantes(bloqueadoHasta, ahora)).toBe(1)
  })
})
