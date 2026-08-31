/**
 * Inventario de SÓLO LECTURA de todo lo que tiene el prefijo de prueba
 * zzz_test / ZZZ_TEST / zzz.test en producción. Sirve para decidir qué
 * limpiar antes de correr scripts/limpiar-datos-prueba.mjs.
 *
 * Uso:
 *   npm run db:nube && npx prisma generate
 *   node scripts/inventario-zzz-test.mjs
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

try {
  const usuarios = await prisma.usuario.findMany({
    where: { email: { contains: 'zzz.test' } },
    select: { id: true, email: true, rol: true, activo: true },
  })
  console.log('\n== Usuarios zzz.test ==')
  usuarios.forEach((u) => console.log(`  [${u.id}] ${u.email} — rol ${u.rol} — activo ${u.activo}`))

  const carreras = await prisma.carrera.findMany({
    where: { nombre: { contains: 'ZZZ_TEST' } },
    select: { id: true, nombre: true, unidadId: true },
  })
  console.log('\n== Carreras ZZZ_TEST ==')
  carreras.forEach((c) => console.log(`  [${c.id}] ${c.nombre} (${c.unidadId})`))

  const cohortes = await prisma.cohorte.findMany({
    where: { nombre: { contains: 'ZZZ_TEST' } },
    select: { id: true, nombre: true, carreraId: true },
  })
  console.log('\n== Cohortes ZZZ_TEST ==')
  cohortes.forEach((c) => console.log(`  [${c.id}] ${c.nombre} (carreraId ${c.carreraId})`))

  const asignaturas = await prisma.asignatura.findMany({
    where: { codigo: { contains: 'ZZZTEST' } },
    select: { codigo: true, nombre: true, estado: true },
  })
  console.log('\n== Asignaturas ZZZTEST ==')
  asignaturas.forEach((a) => console.log(`  ${a.codigo} — ${a.nombre} — estado ${a.estado}`))

  const periodos = await prisma.periodo.findMany({
    where: { nombre: { contains: 'ZZZ_TEST' } },
    select: { id: true, nombre: true, unidadId: true },
  })
  console.log('\n== Períodos ZZZ_TEST ==')
  periodos.forEach((p) => console.log(`  [${p.id}] ${p.nombre} (${p.unidadId})`))

  const aperturas = await prisma.apertura.findMany({
    where: { asignaturaCodigo: { contains: 'ZZZTEST' } },
    include: { periodo: true, cohortes: { include: { cohorte: true } } },
  })
  console.log('\n== Aperturas de asignaturas ZZZTEST ==')
  aperturas.forEach((a) =>
    console.log(
      `  [${a.id}] ${a.asignaturaCodigo} en ${a.periodo.nombre} — cohortes: ${a.cohortes.map((c) => c.cohorte.nombre).join(', ')}`,
    ),
  )

  const docentesAsig = await prisma.asignaturaDocente.findMany({
    where: { nombre: { contains: 'ZZZ' } },
  })
  console.log('\n== AsignaturaDocente con nombre ZZZ ==')
  docentesAsig.forEach((d) => console.log(`  [${d.id}] ${d.nombre} en ${d.asignaturaCodigo}`))

  const pedidos = await prisma.pedidoContrasena.findMany({
    where: { usuario: { email: { contains: 'zzz.test' } } },
    include: { usuario: true },
  })
  console.log('\n== Pedidos de contraseña de usuarios zzz.test ==')
  pedidos.forEach((p) => console.log(`  [${p.id}] ${p.usuario.email} — resuelto: ${p.resuelto ?? 'pendiente'}`))

  const cambios = await prisma.cambio.count({
    where: {
      OR: [
        { asignaturaCodigo: { contains: 'ZZZTEST' } },
        { usuario: { email: { contains: 'zzz.test' } } },
        { carreraId: { in: carreras.map((c) => c.id) } },
      ],
    },
  })
  console.log(`\n== Entradas de bitácora (Cambio) relacionadas con zzz_test: ${cambios} ==`)
} finally {
  await prisma.$disconnect()
}
