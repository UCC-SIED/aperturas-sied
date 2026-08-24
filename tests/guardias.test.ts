import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

const APP = path.resolve(__dirname, '../src/app')

/** Pantallas de antes de tener sesión: no pueden exigirla. */
const SIN_SESION = ['ingresar', 'recuperar', 'elegir-contrasena']

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
})
