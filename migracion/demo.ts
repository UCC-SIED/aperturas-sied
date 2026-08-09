/**
 * Carga la base con los planes de estudio oficiales de las 14 carreras y un
 * conjunto de aperturas reales tomadas de las planillas, para ver el sistema
 * funcionando antes de migrar todo desde los .xlsx.
 *
 * Pasa por el mismo cargador que la migración real: npx tsx migracion/demo.ts
 */
import { prisma } from '../src/lib/db'
import { cargar } from './cargar'
import { PLANES_OFICIALES, todasLasFilas } from './planes-oficiales'
import { PLANES_POSGRADO } from './planes-posgrado'
import type { FilaAsignatura } from './parsers/tipos'
import type { FilaTablero } from './parsers/tablero'
import type { FilaPlanEstudios } from './parsers/planes'

type Periodo = { nombre: string; cursado: [number, number, number]; insc: [number, number, number] }

/** Períodos mensuales de Posgrado, con las fechas de la planilla de aperturas. */
const PERIODOS: Record<string, Periodo> = {
  ago: { nombre: 'Mensual_Agosto_2026', cursado: [2026, 7, 5], insc: [2026, 6, 26] },
  sep: { nombre: 'Mensual_Septiembre_2026', cursado: [2026, 8, 9], insc: [2026, 7, 30] },
  oct: { nombre: 'Mensual_Octubre_2026', cursado: [2026, 9, 7], insc: [2026, 8, 27] },
  nov: { nombre: 'Mensual_Noviembre_2026', cursado: [2026, 10, 4], insc: [2026, 9, 25] },
}

/** Calendario oficial de Educación (hoja de períodos). */
const PERIODOS_EDUCACION = [
  {
    nombre: 'Bimestre C', tipo: 'bimestral' as const, mes: 'Agosto',
    inicioCursado: new Date(2026, 7, 12), aperturaInscripcion: new Date(2026, 7, 3),
    cierreInscripcion: new Date(2026, 7, 9), finCursado: new Date(2026, 9, 3),
    aperturaAfi: new Date(2026, 8, 17), cierreAfi: new Date(2026, 9, 1),
    cierreAsignatura: new Date(2026, 9, 7), actas: new Date(2026, 9, 10),
  },
  {
    nombre: 'Bimestre D', tipo: 'bimestral' as const, mes: 'Octubre',
    inicioCursado: new Date(2026, 9, 21), aperturaInscripcion: new Date(2026, 9, 12),
    cierreInscripcion: new Date(2026, 9, 18), finCursado: new Date(2026, 11, 5),
    aperturaAfi: new Date(2026, 10, 19), cierreAfi: new Date(2026, 11, 3),
    cierreAsignatura: new Date(2026, 11, 9), actas: new Date(2026, 11, 12),
  },
  {
    nombre: 'Cuatrimestral C', tipo: 'cuatrimestral' as const, mes: 'Agosto',
    inicioCursado: new Date(2026, 7, 12), aperturaInscripcion: new Date(2026, 7, 3),
    cierreInscripcion: new Date(2026, 7, 9), finCursado: new Date(2026, 10, 21),
    aperturaAfi: new Date(2026, 10, 5), cierreAfi: new Date(2026, 10, 19),
    cierreAsignatura: new Date(2026, 10, 25), actas: new Date(2026, 10, 28),
  },
]

const d = ([a, m, dd]: [number, number, number]) => new Date(a, m, dd)
const mas = (base: Date, dias: number) => new Date(base.getTime() + dias * 86_400_000)

/** Una apertura de Posgrado en un período mensual. */
function pos(
  carrera: string, codigo: string, cohorte: string,
  periodo: keyof typeof PERIODOS, estadoOrigen: string,
): FilaAsignatura {
  const p = PERIODOS[periodo]
  const cursado = d(p.cursado)
  const nombre = nombreDe(codigo) ?? codigo
  return {
    unidad: 'posgrado', carrera, cohorte, codigo, nombre, catedra: 'DA',
    cargaHoraria: null, orden: null, duracion: null, estadoOrigen, periodoNombre: p.nombre,
    fechas: {
      inicioCursado: cursado, aperturaInscripcion: d(p.insc), cierreInscripcion: mas(d(p.insc), 7),
      finCursado: mas(cursado, 31), aperturaAfi: mas(cursado, 32), cierreAfi: mas(cursado, 53),
      cierreAsignatura: mas(cursado, 62), actas: null,
    },
  }
}

/** Una apertura de Educación: hereda el ciclo del período del calendario. */
function edu(carrera: string, codigo: string, cohorte: string, periodo: string, estadoOrigen: string): FilaAsignatura {
  const p = PERIODOS_EDUCACION.find((x) => x.nombre === periodo)!
  return {
    unidad: 'educacion', carrera, cohorte, codigo, nombre: nombreDe(codigo) ?? codigo,
    catedra: null, cargaHoraria: null, orden: null,
    duracion: p.tipo === 'bimestral' ? 'Bimestral' : 'Cuatrimestral',
    estadoOrigen, periodoNombre: null,
    fechas: {
      inicioCursado: p.inicioCursado, aperturaInscripcion: p.aperturaInscripcion,
      cierreInscripcion: p.cierreInscripcion, finCursado: p.finCursado,
      aperturaAfi: p.aperturaAfi, cierreAfi: p.cierreAfi,
      cierreAsignatura: p.cierreAsignatura, actas: p.actas,
    },
  }
}

const NOMBRES = new Map(todasLasFilas().map((f) => [f.codigo, f.nombre]))
const nombreDe = (codigo: string) => NOMBRES.get(codigo)

const DE = 'Dirección de Empresas'
const AG = 'NT - Alta Gerencia'
const CY = 'NT - Ciberseguridad'
const CI = 'Cooperación Internacional'
const DP = 'Dirección Estratégica de Proyectos'
const OP = 'Operaciones y Cadena de Valor'
const EI = 'Educación Inicial'
const PU = 'Profesorado Universitario'

/** Aperturas tomadas de las planillas de Posgrado y Educación. */
const aperturas: FilaAsignatura[] = [
  // Agosto 2026: la inscripción ya abrió
  pos(CI, 'EP02149', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP01396', 'COHORTE  2025', 'ago', '3.MAQUETACIÓN'),
  pos(DE, 'EP00128', 'COHORTE  2026', 'ago', '5.FINALIZADA'),
  pos(DE, 'EP00046', 'COHORTE  2026', 'ago', '5.FINALIZADA'),
  pos(DE, 'EP00878', 'COHORTE  2026 - 2', 'ago', '5.FINALIZADA'),
  pos(DE, 'EP02618', 'COHORTE  2026 - 2', 'ago', '5.FINALIZADA'),
  pos(AG, 'EP01026', 'COHORTE  2025', 'ago', '5.FINALIZADA'),
  pos(AG, 'EP00461', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP00461', 'COHORTE  2025', 'ago', '3.MAQUETACIÓN'),
  pos(CY, 'EP00459', 'COHORTE  2026', 'ago', '5.FINALIZADA'),
  pos(CY, 'EP01898', 'COHORTE  2026', 'ago', '5.FINALIZADA'),
  pos(CY, 'EP01487', 'COHORTE  2026', 'ago', '5.FINALIZADA'),
  pos(DP, 'EP02934', 'COHORTE  2026', 'ago', '3.MAQUETACIÓN'),
  pos(OP, 'EP02591', 'COHORTE  2026', 'ago', '3.MAQUETACIÓN'),

  // Septiembre 2026: inscripción a tres semanas
  pos(DE, 'EP01864', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP00728', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP01155', 'COHORTE  2026', 'sep', '5.FINALIZADA'),
  pos(DE, 'EP02044', 'COHORTE  2026', 'sep', '5.FINALIZADA'),
  pos(DE, 'EP02397', 'COHORTE  2026 - 2', 'sep', '5.FINALIZADA'),
  pos(DE, 'EP01180', 'COHORTE  2026 - 2', 'sep', '5.FINALIZADA'),
  pos(AG, 'EP01158', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(CY, 'EP00688', 'COHORTE  2026', 'sep', '5.FINALIZADA'),
  pos(CY, 'EP01850', 'COHORTE  2026', 'sep', '3.MAQUETACIÓN'),
  pos(DP, 'EP02935', 'COHORTE  2026', 'sep', '3.MAQUETACIÓN'),

  // Octubre 2026
  pos(DE, 'EP00971', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP00596', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP00402', 'COHORTE  2026', 'oct', '5.FINALIZADA'),
  pos(AG, 'EP00720', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(CY, 'EP00614', 'COHORTE  2026', 'oct', '5.FINALIZADA'),
  // transversal: la misma asignatura en tres carreras
  pos(CY, 'EP01869', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(AG, 'EP01869', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DP, 'EP01869', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS'),

  // Noviembre 2026
  pos(DE, 'EP00582', 'COHORTE  2025', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(DE, 'EP00209', 'COHORTE  2026', 'nov', '5.FINALIZADA'),
  pos(AG, 'EP00031', 'COHORTE  2025', 'nov', '5.FINALIZADA'),
  pos(AG, 'EP02043', 'COHORTE  2025', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  pos(CY, 'EP02040', 'COHORTE  2026', 'nov', '3.MAQUETACIÓN'),
  pos(DP, 'EP02938', 'COHORTE  2026', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS'),

  // Educación
  edu(EI, '1210139', 'COHORTE  4', 'Bimestre C', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  edu(EI, '1210140', 'COHORTE  4', 'Bimestre C', '1.CONTRATACIÓN'),
  edu(EI, '1210136', 'COHORTE  3', 'Bimestre D', '3.MAQUETACIÓN'),
  edu(PU, '1210116', 'COHORTE  4', 'Bimestre C', '3.MAQUETACIÓN'),
  edu(PU, '1220084', 'COHORTE  4', 'Cuatrimestral C', '2.CONSTRUCCIÓN DE CONTENIDOS'),
  edu(PU, '1210119', 'COHORTE  3', 'Bimestre D', '5.FINALIZADA'),
]

/** Docentes y asesores tal como figuran en el tablero de contratación. */
const tablero: FilaTablero[] = PLANES_POSGRADO
  .filter(([, , , , , docente, asesor]) => docente || asesor)
  .map(([carrera, codigo, , , , docente, asesor]) => ({
    codigo, carrera,
    docente: docente || null,
    asesor: asesor || null,
    estado: 'sin_novedad' as const,
  }))

/** Estados de producción del tablero, por código. */
const estadosTablero = new Map(
  PLANES_POSGRADO.map(([, codigo, , , estado]) => [codigo, estado]),
)

/** Los planes oficiales, en el formato que espera el cargador. */
function planesParaCargar(): FilaPlanEstudios[] {
  return todasLasFilas().map((f) => ({
    unidad: f.unidad,
    carrera: f.carrera,
    codigo: f.codigo,
    nombre: f.nombre,
    orden: f.orden,
  }))
}

async function main() {
  await prisma.cambio.deleteMany({})
  await prisma.aperturaCohorte.deleteMany({})
  await prisma.apertura.deleteMany({})
  await prisma.planItem.deleteMany({})
  await prisma.cohorte.deleteMany({})
  await prisma.periodo.deleteMany({})
  await prisma.usuarioCarrera.deleteMany({})
  await prisma.asignatura.deleteMany({})
  await prisma.carrera.deleteMany({})

  const r = await cargar(aperturas, tablero, prisma, PERIODOS_EDUCACION, planesParaCargar())

  // El estado de producción que conoce el tablero, para las que no vinieron con apertura
  for (const [codigo, estadoOrigen] of estadosTablero) {
    if (!estadoOrigen) continue
    const a = await prisma.asignatura.findUnique({ where: { codigo } })
    if (a && a.estado === 'sin_novedad') {
      const { mapEstado } = await import('../src/lib/normalizar')
      await prisma.asignatura.update({ where: { codigo }, data: { estado: mapEstado(estadoOrigen) } })
    }
  }

  console.log('Demo cargada:', r)
  const carreras = await prisma.carrera.findMany({
    include: { unidad: true, _count: { select: { planItems: true } } },
    orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }],
  })
  console.log('\nPlanes de estudio:')
  for (const c of carreras) {
    console.log(`  ${c.unidad.nombre.padEnd(10)} ${c.nombre.padEnd(34)} ${c._count.planItems} asignaturas`)
  }
  const total = await prisma.asignatura.count()
  const compartidas = (await prisma.asignatura.findMany({ include: { planItems: true } }))
    .filter((a) => a.planItems.length > 1).length
  console.log(`\n${total} asignaturas · ${compartidas} compartidas entre carreras · ${await prisma.apertura.count()} aperturas`)
  await prisma.$disconnect()
}

main()
