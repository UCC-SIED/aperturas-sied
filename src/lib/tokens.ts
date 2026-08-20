import { randomBytes, createHash } from 'crypto'

/**
 * Token para el link de "olvidé mi contraseña". Ya es al azar y de un solo
 * uso, así que alcanza con un hash rápido (a diferencia de la contraseña,
 * que necesita uno lento porque alguien podría intentar adivinarla). Se
 * busca por igualdad en la base, no hace falta comparar a mano.
 */
export function generarToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
