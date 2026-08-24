import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

const APP = path.resolve(__dirname, '../src/app')

/** Pantallas de antes de tener sesión: no pueden exigirla. */
const SIN_SESION = ['ingresar', 'recuperar', 'elegir-contrasena']

/**
 * Acciones que no pueden (o no deben) exigir sesión activa:
 * - ingresar/actions.ts: es el propio login, todavía no hay sesión que exigir.
 * - recuperar/actions.ts: la usa gente que todavía no ingresó.
 * - elegir-contrasena/actions.ts: es la pantalla adonde caen los que tienen
 *   la marca puesta; verifica la marca a mano (exigirSesionActiva redirigiría
 *   otra vez para acá y sería un bucle).
 */
const SIN_SESION_ACTIVA = ['ingresar/actions.ts', 'recuperar/actions.ts', 'elegir-contrasena/actions.ts']

function paginas(dir: string): string[] {
  const encontradas: string[] = []
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada)
    if (statSync(completo).isDirectory()) {
      if (SIN_SESION.includes(entrada) || entrada === 'api') continue
      encontradas.push(...paginas(completo))
    } else if (entrada === 'page.tsx') {
      encontradas.push(completo)
    }
  }
  return encontradas
}

function acciones(dir: string): string[] {
  const encontradas: string[] = []
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada)
    if (statSync(completo).isDirectory()) {
      if (entrada === 'api') continue
      encontradas.push(...acciones(completo))
    } else if (entrada === 'actions.ts') {
      encontradas.push(completo)
    }
  }
  return encontradas
}

describe('guardias de sesión', () => {
  // Sin esto, una pantalla nueva puede quedar sin guardia y nadie se entera
  // hasta que alguien entra sin haber elegido su contraseña.
  it('toda pantalla autenticada usa exigirSesion()', () => {
    const encontradas = paginas(APP)
    expect(encontradas.length).toBeGreaterThanOrEqual(10)

    const sinGuardia = encontradas.filter(
      (p) => !readFileSync(p, 'utf8').includes('exigirSesion('),
    )
    expect(sinGuardia.map((p) => path.relative(APP, p))).toEqual([])
  })

  // Este es el que habría cazado el agujero de elegir-contrasena/actions.ts:
  // una pantalla puede tener su guardia y aun así dejar una acción sin la suya.
  it('toda acción autenticada usa exigirSesionActiva()', () => {
    const encontradas = acciones(APP).filter(
      (p) => !SIN_SESION_ACTIVA.includes(path.relative(APP, p).replace(/\\/g, '/')),
    )
    expect(encontradas.length).toBeGreaterThanOrEqual(1)

    const sinGuardia = encontradas.filter(
      (p) => !readFileSync(p, 'utf8').includes('exigirSesionActiva'),
    )
    expect(sinGuardia.map((p) => path.relative(APP, p))).toEqual([])
  })
})
