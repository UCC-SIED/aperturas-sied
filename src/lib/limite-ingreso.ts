/**
 * Frena los intentos de adivinar una contraseña por fuerza bruta: sin esto,
 * nada impedía probar contraseñas seguidas contra el mismo correo, uno atrás
 * de otro, para siempre.
 *
 * Después de cinco fallos seguidos, la cuenta se bloquea un rato —aunque la
 * contraseña que se pruebe después sea la correcta— y la espera crece cada
 * vez que se repite: un minuto, después cinco, después quince. Entrar bien
 * una vez borra el contador: un fallo aislado no acumula para siempre, sólo
 * importan los fallos consecutivos recientes.
 */

const INTENTOS_ANTES_DE_BLOQUEAR = 5
const MINUTOS_DE_ESPERA = [1, 5, 15]

export type EstadoIntentos = {
  intentosFallidos: number
  nivelBloqueo: number
  bloqueadoHasta: Date | null
}

/** Si el bloqueo sigue vigente en este momento. */
export function estaBloqueado(estado: Pick<EstadoIntentos, 'bloqueadoHasta'>, ahora: Date): boolean {
  return estado.bloqueadoHasta !== null && estado.bloqueadoHasta > ahora
}

/** Cuántos minutos faltan, redondeando siempre para arriba: nunca "0 minutos" con el bloqueo activo. */
export function minutosRestantes(bloqueadoHasta: Date, ahora: Date): number {
  return Math.max(1, Math.ceil((bloqueadoHasta.getTime() - ahora.getTime()) / 60000))
}

/** Lo que hay que guardar después de un intento con la contraseña mal. */
export function trasIntentoFallido(estado: EstadoIntentos, ahora: Date): EstadoIntentos {
  const intentos = estado.intentosFallidos + 1
  if (intentos < INTENTOS_ANTES_DE_BLOQUEAR) {
    return { intentosFallidos: intentos, nivelBloqueo: estado.nivelBloqueo, bloqueadoHasta: null }
  }

  // Se llegó al límite: arranca (o extiende) el bloqueo, y el contador de
  // intentos vuelve a cero para la próxima tanda.
  const nivel = estado.nivelBloqueo + 1
  const minutos = MINUTOS_DE_ESPERA[Math.min(nivel, MINUTOS_DE_ESPERA.length) - 1]
  return {
    intentosFallidos: 0,
    nivelBloqueo: nivel,
    bloqueadoHasta: new Date(ahora.getTime() + minutos * 60_000),
  }
}

/** Entrar bien borra todo: ni cuenta los fallos anteriores ni deja rastro del nivel de bloqueo. */
export function trasIngresoExitoso(): EstadoIntentos {
  return { intentosFallidos: 0, nivelBloqueo: 0, bloqueadoHasta: null }
}
