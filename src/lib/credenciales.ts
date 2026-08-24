import { randomInt } from 'crypto'
import { prisma } from './db'
import { hashContrasena, verificarContrasena } from './contrasenas'

export const CONTRASENA_MINIMA = 8

/**
 * Palabras cortas y sin tildes ni ñ: la provisoria se dicta por teléfono y se
 * tipea en cualquier teclado, incluido uno mal configurado.
 */
const PALABRAS = [
  'agua', 'aire', 'alga', 'ancla', 'arbol', 'arena', 'aula', 'avena',
  'bahia', 'balsa', 'banco', 'barco', 'bosque', 'brisa', 'brote', 'buho',
  'cabo', 'calle', 'campo', 'canto', 'casa', 'cedro', 'cielo', 'cima',
  'clavo', 'cobre', 'coral', 'costa', 'cuadro', 'cueva', 'dedo', 'delta',
  'duna', 'faro', 'fibra', 'flor', 'foco', 'fuego', 'fuente', 'gota',
  'grano', 'hielo', 'hoja', 'hongo', 'humo', 'isla', 'jarra', 'lago',
  'lampara', 'lanza', 'laurel', 'leon', 'lima', 'limon', 'lirio', 'llave',
  'lluvia', 'loma', 'luna', 'lupa', 'maiz', 'manto', 'mapa', 'mesa',
  'miel', 'monte', 'mora', 'musgo', 'nido', 'niebla', 'nieve', 'nogal',
  'nube', 'nuez', 'olivo', 'olmo', 'onda', 'oro', 'paja', 'palma',
  'papel', 'pato', 'pera', 'pino', 'pluma', 'pozo', 'prado', 'puente',
  'puerto', 'rama', 'remo', 'rio', 'roble', 'roca', 'sal', 'sauce',
  'selva', 'sierra', 'silla', 'sol', 'tela', 'tierra', 'tigre', 'torre',
  'trigo', 'valle', 'vela', 'viento',
]

/**
 * Contraseña de un solo uso para el alta. Se genera con `randomInt` del módulo
 * nativo y no con Math.random: es la que protege la cuenta hasta que la persona
 * entre por primera vez.
 */
export function generarProvisoria(): string {
  const palabras = Array.from({ length: 3 }, () => PALABRAS[randomInt(PALABRAS.length)])
  return `${palabras.join('-')}-${randomInt(100, 1000)}`
}

type Resultado = { error: string | null }

/** Lo común de los dos caminos: validar el largo, guardar el hash y anotar. */
async function guardar(usuarioId: number, nueva: string, queHizo: string): Promise<Resultado> {
  if (nueva.length < CONTRASENA_MINIMA) {
    return { error: `La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres` }
  }

  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) return { error: 'No encontramos tu usuario. Volvé a ingresar.' }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { passwordHash: hashContrasena(nueva), debeElegirContrasena: false },
  })

  // Un cambio de credenciales tiene que quedar rastreable, igual que los que
  // hace administración desde /admin.
  await prisma.cambio.create({
    data: { usuarioId, accion: 'gestion_usuarios', detalle: `${u.nombre}: ${queHizo}` },
  })

  return { error: null }
}

/** Primer ingreso: no se pide la anterior porque la acaba de usar para entrar. */
export async function elegirPrimeraContrasena(usuarioId: number, nueva: string): Promise<Resultado> {
  return guardar(usuarioId, nueva, 'eligió su contraseña al primer ingreso')
}

/**
 * Cambio desde el perfil. Pedir la actual es lo que evita que alguien que
 * encuentre una sesión abierta se apropie de la cuenta.
 */
export async function cambiarContrasenaPropia(
  usuarioId: number,
  actual: string,
  nueva: string,
): Promise<Resultado> {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) return { error: 'No encontramos tu usuario. Volvé a ingresar.' }
  if (!verificarContrasena(actual, u.passwordHash)) {
    return { error: 'La contraseña actual no coincide' }
  }
  return guardar(usuarioId, nueva, 'cambió su contraseña desde su perfil')
}
