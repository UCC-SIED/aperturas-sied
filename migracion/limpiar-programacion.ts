/**
 * Deja el sistema con el catálogo cargado y la programación en cero.
 *
 * Se conserva lo que viene de fuentes confiables:
 *   · los planes de estudio oficiales del sistema de gestión (carreras,
 *     asignaturas, códigos, orden, carga horaria);
 *   · el seguimiento del tablero de contratación (estado, docente, asesor).
 *
 * Se borra lo que salió de las planillas de fechas, que tenían datos mal:
 *   · períodos, cohortes y aperturas, con su historial de planificación.
 *
 * Uso: npx tsx migracion/limpiar-programacion.ts
 */
import { prisma } from '../src/lib/db'

async function main() {
  const antes = {
    periodos: await prisma.periodo.count(),
    cohortes: await prisma.cohorte.count(),
    aperturas: await prisma.apertura.count(),
    cambios: await prisma.cambio.count(),
  }

  // El orden importa: primero lo que referencia, después lo referenciado
  await prisma.aperturaCohorte.deleteMany({})
  await prisma.apertura.deleteMany({})
  await prisma.cohorte.deleteMany({})
  await prisma.periodo.deleteMany({})
  // El historial de planificación pierde sentido sin las aperturas que describe
  await prisma.cambio.deleteMany({
    where: { accion: { in: ['agrego_apertura', 'quito_apertura', 'movio_apertura'] } },
  })

  console.log('Borrado:')
  console.log(`  ${antes.periodos} períodos`)
  console.log(`  ${antes.cohortes} cohortes`)
  console.log(`  ${antes.aperturas} aperturas`)
  console.log(`  ${antes.cambios - (await prisma.cambio.count())} registros de historial`)

  console.log('\nSe conserva:')
  console.log(`  ${await prisma.carrera.count()} carreras`)
  console.log(`  ${await prisma.asignatura.count()} asignaturas`)
  console.log(`  ${await prisma.planItem.count()} filas de plan de estudios`)
  console.log(`  ${await prisma.usuario.count()} usuarios`)

  const conEstado = await prisma.asignatura.count({ where: { estado: { not: 'sin_novedad' } } })
  const conDocente = await prisma.asignatura.count({ where: { docente: { not: null } } })
  console.log(`  ${conEstado} asignaturas con estado de producción cargado`)
  console.log(`  ${conDocente} con docente asignado`)

  await prisma.$disconnect()
}

main()
