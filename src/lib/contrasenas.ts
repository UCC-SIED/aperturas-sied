import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Hash + sal con scrypt (módulo nativo de Node, sin dependencias nuevas).
 * Se guarda como "sal:hash", los dos en hexadecimal.
 */
export function hashContrasena(plano: string): string {
  const sal = randomBytes(16).toString('hex')
  const hash = scryptSync(plano, sal, 64).toString('hex')
  return `${sal}:${hash}`
}

/** Compara con tiempo constante para no filtrar por cuánto tarda la respuesta. */
export function verificarContrasena(plano: string, guardado: string | null): boolean {
  if (!guardado) return false
  const [sal, hashGuardado] = guardado.split(':')
  if (!sal || !hashGuardado) return false

  const hash = scryptSync(plano, sal, 64)
  const hashGuardadoBuf = Buffer.from(hashGuardado, 'hex')
  if (hash.length !== hashGuardadoBuf.length) return false
  return timingSafeEqual(hash, hashGuardadoBuf)
}
