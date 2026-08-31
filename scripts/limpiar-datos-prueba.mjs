/**
 * Limpia el ruido acumulado por corridas repetidas de la suite E2E de
 * Playwright (tests/*.spec.ts) contra producción.
 *
 * Conserva el fixture permanente documentado en specs/plan.md — las dos
 * cuentas de login (zzz.test.e2e@ucc.edu.ar, zzz.test.consulta@ucc.edu.ar),
 * ZZZ_TEST_CARRERA, ZZZ_TEST_COHORTE y ZZZ_TEST_ASIGNATURA — porque sin eso
 * la suite no puede volver a correr sin recrearlos a mano.
 *
 * Borra lo descartable que cada corrida deja atrás: el usuario de prueba que
 * crean los tests de /admin, la cohorte con sufijo de timestamp que crea
 * crear-cohorte.spec.ts, los pedidos de contraseña que generan los tests de
 * /recuperar, y las entradas de bitácora (Cambio) que todo esto deja en el
 * historial real del sistema.
 *
 * Uso:
 *   npm run db:nube && npx prisma generate
 *   node scripts/limpiar-datos-prueba.mjs
 *   npm run db:local && npx prisma generate
 */
import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

function leerVariable(archivo, clave) {
  const texto = readFileSync(archivo, 'utf8')
  const linea = texto.split(/\r?\n/).find((l) => l.trim().startsWith(`${clave}=`))
  if (!linea) return null
  return linea.slice(linea.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

const url = leerVariable('.env.produccion', 'DATABASE_URL')
if (!url || url.startsWith('file:')) {
  console.error('DATABASE_URL de .env.produccion no apunta a producción.')
  process.exit(1)
}

const prisma = new PrismaClient({ datasourceUrl: url })

const CUENTAS_A_CONSERVAR = ['zzz.test.e2e@ucc.edu.ar', 'zzz.test.consulta@ucc.edu.ar']

try {
  // 1. Bitácora de prueba (Cambio no tiene cascade hacia Usuario: hay que
  //    borrarla antes de tocar los usuarios de prueba).
  const carreras = await prisma.carrera.findMany({ where: { nombre: { contains: 'ZZZ_TEST' } } })
  const cambiosBorrados = await prisma.cambio.deleteMany({
    where: {
      OR: [
        { asignaturaCodigo: { contains: 'ZZZTEST' } },
        { usuario: { email: { contains: 'zzz.test' } } },
        { carreraId: { in: carreras.map((c) => c.id) } },
      ],
    },
  })
  console.log(`Bitácora de prueba borrada: ${cambiosBorrados.count}`)

  // 2. Pedidos de contraseña generados por los tests de /recuperar (de
  //    cualquier cuenta zzz.test, incluidas las que se conservan).
  const pedidosBorrados = await prisma.pedidoContrasena.deleteMany({
    where: { usuario: { email: { contains: 'zzz.test' } } },
  })
  console.log(`Pedidos de contraseña de prueba borrados: ${pedidosBorrados.count}`)

  // 3. Cohorte(s) descartables: cualquier ZZZ_TEST_COHORTE_* que no sea la
  //    canónica (crear-cohorte.spec.ts crea una nueva con timestamp cada corrida).
  const cohortesDescartables = await prisma.cohorte.findMany({
    where: { nombre: { startsWith: 'ZZZ_TEST_COHORTE_' } },
  })
  if (cohortesDescartables.length) {
    await prisma.aperturaCohorte.deleteMany({
      where: { cohorteId: { in: cohortesDescartables.map((c) => c.id) } },
    })
    await prisma.cohorte.deleteMany({
      where: { id: { in: cohortesDescartables.map((c) => c.id) } },
    })
  }
  console.log(`Cohortes de prueba descartables borradas: ${cohortesDescartables.length}`)
  cohortesDescartables.forEach((c) => console.log(`  - ${c.nombre}`))

  // 4. Usuarios de prueba descartables (todos los zzz.test.* salvo las dos
  //    cuentas de login que la suite necesita para volver a entrar).
  const usuariosDescartables = await prisma.usuario.findMany({
    where: {
      email: { contains: 'zzz.test' },
      NOT: { email: { in: CUENTAS_A_CONSERVAR } },
    },
  })
  if (usuariosDescartables.length) {
    await prisma.usuario.deleteMany({
      where: { id: { in: usuariosDescartables.map((u) => u.id) } },
    })
  }
  console.log(`Usuarios de prueba descartables borrados: ${usuariosDescartables.length}`)
  usuariosDescartables.forEach((u) => console.log(`  - ${u.email}`))

  console.log('\nSe conserva (fixture permanente de la suite):')
  const [carrera, cohorte, asignatura] = await Promise.all([
    prisma.carrera.findFirst({ where: { nombre: 'ZZZ_TEST_CARRERA' } }),
    prisma.cohorte.findFirst({ where: { nombre: 'ZZZ_TEST_COHORTE' } }),
    prisma.asignatura.findUnique({ where: { codigo: 'ZZZTEST001' } }),
  ])
  console.log(`  Carrera: ${carrera ? carrera.nombre : 'FALTA'}`)
  console.log(`  Cohorte: ${cohorte ? cohorte.nombre : 'FALTA'}`)
  console.log(`  Asignatura: ${asignatura ? asignatura.codigo : 'FALTA'}`)
  for (const email of CUENTAS_A_CONSERVAR) {
    const u = await prisma.usuario.findUnique({ where: { email } })
    console.log(`  Usuario ${email}: ${u ? 'OK' : 'FALTA'}`)
  }
} finally {
  await prisma.$disconnect()
}
