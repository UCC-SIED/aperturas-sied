/**
 * Carga el catálogo desde cero: carreras, asignaturas y planes de estudio.
 *
 * Dos fuentes, las dos confiables:
 *   · los reportes del sistema de gestión de la universidad (planes oficiales);
 *   · el tablero de contratación del área (estado de producción, docente, asesor).
 *
 * No carga períodos, cohortes ni aperturas: esa programación se arma en el
 * sistema, no se importa. Las planillas de fechas que había tenían datos mal.
 *
 * Uso: npm run base
 */
import { prisma } from '../src/lib/db'
import { PLANES_OFICIALES, todasLasFilas } from './planes-oficiales'
import { PLANES_POSGRADO } from './planes-posgrado'
import { mapEstado } from '../src/lib/normalizar'
import { parseDocentes, resolverDocentes } from '../src/lib/docentes'

/** Estado, docente y asesor del tablero, por código de asignatura. */
function datosDelTablero() {
  const datos = new Map<string, { estado: string; docente: string | null; asesor: string | null }>()
  for (const [, codigo, , , estado, docente, asesor] of PLANES_POSGRADO) {
    // Una asignatura compartida puede figurar en varias carreras del tablero:
    // gana el estado más avanzado y el primer docente que aparezca.
    const previo = datos.get(codigo)
    const nuevo = mapEstado(estado)
    datos.set(codigo, {
      estado: previo && ordenEstado(previo.estado) > ordenEstado(nuevo) ? previo.estado : nuevo,
      docente: previo?.docente ?? (docente || null),
      asesor: previo?.asesor ?? (asesor || null),
    })
  }
  return datos
}

const ESCALA = [
  'sin_novedad', 'contratacion', 'validacion_docente', 'contrato',
  'construccion', 'revision', 'maquetacion', 'finalizacion',
]
const ordenEstado = (e: string) => ESCALA.indexOf(e)

async function main() {
  const tablero = datosDelTablero()

  await prisma.unidad.upsert({ where: { id: 'posgrado' }, update: {}, create: { id: 'posgrado', nombre: 'Posgrado' } })
  await prisma.unidad.upsert({ where: { id: 'educacion' }, update: {}, create: { id: 'educacion', nombre: 'Educación' } })

  for (const plan of PLANES_OFICIALES) {
    const carrera = await prisma.carrera.upsert({
      where: { unidadId_nombre: { unidadId: plan.unidad, nombre: plan.carrera } },
      update: {},
      create: { unidadId: plan.unidad, nombre: plan.carrera },
    })

    for (const a of plan.asignaturas) {
      const t = tablero.get(a.codigo)
      await prisma.asignatura.upsert({
        where: { codigo: a.codigo },
        update: { nombre: a.nombre, cargaHoraria: a.horas },
        create: {
          codigo: a.codigo,
          nombre: a.nombre,
          cargaHoraria: a.horas,
          estado: t?.estado ?? 'sin_novedad',
          asesor: t?.asesor ?? null,
        },
      })
      const docentesIds = await resolverDocentes(prisma, parseDocentes(t?.docente ?? ''))
      for (const [i, docenteId] of docentesIds.entries()) {
        await prisma.asignaturaDocente.upsert({
          where: { asignaturaCodigo_docenteId: { asignaturaCodigo: a.codigo, docenteId } },
          update: {},
          create: { asignaturaCodigo: a.codigo, docenteId, orden: i },
        })
      }
      await prisma.planItem.upsert({
        where: { carreraId_asignaturaCodigo: { carreraId: carrera.id, asignaturaCodigo: a.codigo } },
        update: { orden: a.orden },
        create: { carreraId: carrera.id, asignaturaCodigo: a.codigo, orden: a.orden },
      })
    }
  }

  const carreras = await prisma.carrera.findMany({
    include: { unidad: true, _count: { select: { planItems: true } } },
    orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }],
  })
  console.log('Catálogo cargado:\n')
  for (const c of carreras) {
    console.log(`  ${c.unidad.nombre.padEnd(10)} ${c.nombre.padEnd(34)} ${c._count.planItems}`)
  }

  const total = await prisma.asignatura.count()
  const compartidas = (await prisma.asignatura.findMany({ include: { planItems: true } }))
    .filter((a) => a.planItems.length > 1).length
  const conEstado = await prisma.asignatura.count({ where: { estado: { not: 'sin_novedad' } } })

  console.log(`\n${total} asignaturas · ${compartidas} compartidas entre carreras`)
  console.log(`${conEstado} con estado de producción del tablero`)
  console.log(`${await prisma.periodo.count()} períodos · ${await prisma.apertura.count()} aperturas (se cargan desde el sistema)`)
  console.log(`\nAsignaturas del catálogo: ${todasLasFilas().length} filas de plan`)

  await prisma.$disconnect()
}

main()
