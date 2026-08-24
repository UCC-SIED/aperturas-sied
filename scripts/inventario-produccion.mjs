/**
 * Inventario de SÓLO LECTURA de la base de producción.
 *
 * No escribe nada. Sirve para saber qué hay cargado antes de decidir qué
 * limpiar: cuántas aperturas cuelgan de cada período, qué cohortes existen,
 * y qué datos de seguimiento de producción hay tocados.
 *
 * Uso, desde la raíz del proyecto:
 *
 *   npm run db:nube && npx prisma generate
 *   node scripts/inventario-produccion.mjs
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
const fecha = (d) => (d ? d.toISOString().slice(0, 10) : '—')

try {
  console.log('\n========== PERÍODOS Y SUS APERTURAS ==========\n')
  const periodos = await prisma.periodo.findMany({
    include: {
      unidad: true,
      _count: { select: { aperturas: true } },
    },
    orderBy: [{ unidadId: 'asc' }, { inicioCursado: 'asc' }],
  })
  for (const p of periodos) {
    console.log(
      `[${String(p.id).padStart(4)}] ${p.nombre.padEnd(26)} ${p.unidad.nombre.padEnd(10)} ` +
      `${p.tipo.padEnd(14)} cursado ${fecha(p.inicioCursado)}  aperturas: ${p._count.aperturas}`,
    )
  }
  console.log(`\nTotal: ${periodos.length} períodos, ${periodos.reduce((n, p) => n + p._count.aperturas, 0)} aperturas.`)

  console.log('\n========== APERTURAS POR CARRERA ==========\n')
  const cohortes = await prisma.cohorte.findMany({
    include: {
      carrera: { include: { unidad: true } },
      _count: { select: { aperturas: true } },
    },
    orderBy: [{ carreraId: 'asc' }, { nombre: 'asc' }],
  })
  if (!cohortes.length) console.log('(no hay cohortes cargadas)')
  for (const c of cohortes) {
    console.log(
      `${c.carrera.nombre.padEnd(38)} ${c.nombre.padEnd(20)} ` +
      `aperturas vinculadas: ${c._count.aperturas}`,
    )
  }
  console.log(`\nTotal: ${cohortes.length} cohortes.`)

  console.log('\n========== SEGUIMIENTO DE PRODUCCIÓN TOCADO ==========\n')
  const [conEstado, conDocente, conAsesor, conObs, docentesTutor] = await Promise.all([
    prisma.asignatura.count({ where: { estado: { not: 'sin_novedad' } } }),
    prisma.asignaturaDocente.count(),
    prisma.asignatura.count({ where: { AND: [{ asesor: { not: null } }, { asesor: { not: '' } }] } }),
    prisma.asignatura.count({ where: { AND: [{ observaciones: { not: null } }, { observaciones: { not: '' } }] } }),
    prisma.aperturaDocente.count(),
  ])
  console.log(`Asignaturas con estado distinto de "sin novedad": ${conEstado}`)
  console.log(`Docentes asignados a asignaturas:                ${conDocente}`)
  console.log(`Asignaturas con asesor cargado:                  ${conAsesor}`)
  console.log(`Asignaturas con observaciones:                   ${conObs}`)
  console.log(`Docentes tutores por apertura:                   ${docentesTutor}`)

  console.log('\n========== ESTRUCTURA (esto NO se toca) ==========\n')
  const [unidades, carreras, asignaturas, planItems, usuarios] = await Promise.all([
    prisma.unidad.count(),
    prisma.carrera.count(),
    prisma.asignatura.count(),
    prisma.planItem.count(),
    prisma.usuario.count(),
  ])
  console.log(`Unidades: ${unidades} · Carreras: ${carreras} · Asignaturas: ${asignaturas} · Items de plan: ${planItems} · Usuarios: ${usuarios}`)

  console.log('\n========== OTROS ==========\n')
  const [cambios, avisos, pedidos] = await Promise.all([
    prisma.cambio.count(),
    prisma.avisoDescartado.count(),
    prisma.pedidoContrasena.count(),
  ])
  console.log(`Entradas de bitácora: ${cambios} · Avisos descartados: ${avisos} · Pedidos de contraseña: ${pedidos}`)
  console.log('')
} finally {
  await prisma.$disconnect()
}
