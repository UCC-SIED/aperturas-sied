/**
 * Puerta de emergencia: le fija una contraseña a un usuario escribiendo
 * directo en la base de producción, sin pasar por la aplicación.
 *
 * Existe para un solo caso: que nadie con rol de administración pueda entrar,
 * y por lo tanto no haya nadie que pueda atender un pedido desde /admin. Es un
 * círculo del que no se sale por la interfaz.
 *
 * No guarda ni imprime la contraseña: la pide por teclado y sólo escribe el
 * hash, con el mismo scrypt que usa src/lib/contrasenas.ts.
 *
 * Uso, desde la raíz del proyecto:
 *
 *   npm run db:nube && npx prisma generate
 *   node scripts/contrasena-de-emergencia.mjs
 *   npm run db:local && npx prisma generate
 *
 * Los dos pasos de alrededor son para que el cliente de Prisma hable
 * PostgreSQL mientras corre el script, y vuelva a SQLite para seguir
 * trabajando en local.
 */
import { readFileSync } from 'fs'
import { createInterface } from 'readline'
import { scryptSync, randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'

/** Lee una clave de un archivo .env sin depender de dotenv. */
function leerVariable(archivo, clave) {
  const texto = readFileSync(archivo, 'utf8')
  const linea = texto.split(/\r?\n/).find((l) => l.trim().startsWith(`${clave}=`))
  if (!linea) return null
  return linea.slice(linea.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

/** Mismo esquema que src/lib/contrasenas.ts: "sal:hash", los dos en hexadecimal. */
function hashContrasena(plano) {
  const sal = randomBytes(16).toString('hex')
  return `${sal}:${scryptSync(plano, sal, 64).toString('hex')}`
}

function preguntar(consola, texto) {
  return new Promise((resolver) => consola.question(texto, resolver))
}

const CONTRASENA_MINIMA = 8

const url = leerVariable('.env.produccion', 'DATABASE_URL')
if (!url) {
  console.error('No encontré DATABASE_URL en .env.produccion.')
  process.exit(1)
}
if (url.startsWith('file:')) {
  console.error('DATABASE_URL de .env.produccion apunta a un archivo SQLite, no a producción.')
  process.exit(1)
}

const consola = createInterface({ input: process.stdin, output: process.stdout })
const prisma = new PrismaClient({ datasourceUrl: url })

try {
  console.log(`\nBase: ${url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}\n`)

  const email = (await preguntar(consola, 'Correo del usuario: ')).trim().toLowerCase()
  const u = await prisma.usuario.findUnique({ where: { email } })
  if (!u) {
    console.error(`\nNo existe ningún usuario con el correo ${email} en esa base.`)
    process.exit(1)
  }

  console.log(`\nEncontrado: ${u.nombre} — rol ${u.rol}${u.activo ? '' : ' (DADO DE BAJA)'}`)
  if (!u.activo) {
    console.log('Ojo: con el acceso dado de baja no va a poder entrar ni con la contraseña nueva.')
  }

  // Se escribe en pantalla: es una terminal local y de una sola vez. Lo que no
  // se hace nunca es guardarla ni mandarla a ninguna parte.
  const nueva = await preguntar(consola, `\nContraseña nueva (mínimo ${CONTRASENA_MINIMA} caracteres): `)
  if (nueva.length < CONTRASENA_MINIMA) {
    console.error(`\nTiene que tener al menos ${CONTRASENA_MINIMA} caracteres. No cambié nada.`)
    process.exit(1)
  }

  const confirma = await preguntar(consola, 'Repetila para confirmar: ')
  if (nueva !== confirma) {
    console.error('\nNo coinciden. No cambié nada.')
    process.exit(1)
  }

  await prisma.usuario.update({
    where: { id: u.id },
    data: { passwordHash: hashContrasena(nueva) },
  })

  // Que quede en la bitácora: un cambio de credenciales por fuera de la
  // aplicación tiene que ser rastreable igual que los que se hacen desde /admin.
  await prisma.cambio.create({
    data: {
      usuarioId: u.id,
      accion: 'gestion_usuarios',
      detalle: `${u.nombre}: contraseña reiniciada desde la consola (puerta de emergencia)`,
    },
  })

  // Si tenía un pedido esperando, ya está atendido.
  const sellados = await prisma.pedidoContrasena.updateMany({
    where: { usuarioId: u.id, resuelto: null },
    data: { resuelto: new Date() },
  })

  console.log(`\nListo. ${u.nombre} ya puede entrar con la contraseña nueva.`)
  if (sellados.count > 0) {
    console.log(`Cerré ${sellados.count} pedido(s) de contraseña que tenía pendiente(s).`)
  }
  console.log('Queda anotado en la bitácora de /admin.\n')
} finally {
  consola.close()
  await prisma.$disconnect()
}
