// Datos reales tomados de las planillas y del tablero de contratación, para ver
// el sistema funcionando antes de correr la migración completa desde los .xlsx.
// Pasa por el mismo cargador que la migración real: npx tsx migracion/demo.ts
import { prisma } from '../src/lib/db'
import { cargar } from './cargar'
import { PLANES_POSGRADO } from './planes-posgrado'
import type { FilaAsignatura } from './parsers/tipos'
import type { FilaTablero } from './parsers/tablero'

type Periodo = { nombre: string; cursado: [number, number, number]; insc: [number, number, number] }

const PERIODOS: Record<string, Periodo> = {
  ago: { nombre: 'Mensual_Agosto_2026', cursado: [2026, 7, 5], insc: [2026, 6, 26] },
  sep: { nombre: 'Mensual_Septiembre_2026', cursado: [2026, 8, 9], insc: [2026, 7, 30] },
  oct: { nombre: 'Mensual_Octubre_2026', cursado: [2026, 9, 7], insc: [2026, 8, 27] },
  nov: { nombre: 'Mensual_Noviembre_2026', cursado: [2026, 10, 4], insc: [2026, 9, 25] },
}

const d = ([a, m, dd]: [number, number, number]) => new Date(a, m, dd)
const mas = (base: Date, dias: number) => new Date(base.getTime() + dias * 86_400_000)

function pos(
  carrera: string, codigo: string, nombre: string, cohorte: string,
  periodo: keyof typeof PERIODOS, estadoOrigen: string, _orden: number,
): FilaAsignatura {
  const p = PERIODOS[periodo]
  const cursado = d(p.cursado)
  return {
    // el orden en el plan lo define PLANES_POSGRADO, no esta fila
    unidad: 'posgrado', carrera, cohorte, codigo, nombre, catedra: 'DA',
    cargaHoraria: 21, orden: null, duracion: null, estadoOrigen, periodoNombre: p.nombre,
    fechas: {
      inicioCursado: cursado, aperturaInscripcion: d(p.insc), cierreInscripcion: mas(d(p.insc), 7),
      finCursado: mas(cursado, 31), aperturaAfi: mas(cursado, 32), cierreAfi: mas(cursado, 53),
      cierreAsignatura: mas(cursado, 62), actas: null,
    },
  }
}

function edu(
  carrera: string, codigo: string, nombre: string, cohorte: string,
  duracion: 'Bimestral' | 'Cuatrimestral', cursado: [number, number, number], estadoOrigen: string, orden: number,
): FilaAsignatura {
  const ini = d(cursado)
  const largo = duracion === 'Bimestral' ? 52 : 108
  return {
    unidad: 'educacion', carrera, cohorte, codigo, nombre, catedra: null,
    cargaHoraria: null, orden, duracion, estadoOrigen, periodoNombre: null,
    fechas: {
      inicioCursado: ini, aperturaInscripcion: mas(ini, -9), cierreInscripcion: mas(ini, -3),
      finCursado: mas(ini, largo), aperturaAfi: mas(ini, largo - 16), cierreAfi: mas(ini, largo - 2),
      cierreAsignatura: mas(ini, largo + 4), actas: mas(ini, largo + 7),
    },
  }
}

// Los nombres son los del tablero de contratación, que es de donde salen los
// planes de estudio completos.
const DE = 'Dirección de Empresas'
const AG = 'Nuevas Tecnologías'
const CY = 'Nuevas Tecnologías'
const CI = 'Cooperación Internacional'
const DP = 'Dirección Estratégica de Proyectos'

const filas: FilaAsignatura[] = [
  // ---- Agosto 2026 (la inscripción ya abrió: lo que no esté listo está en rojo)
  pos(CI, 'EP02149', 'TALLER DE TRABAJO FINAL INTEGRADOR', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS', 11),
  pos(DE, 'EP01396', 'INSTRUMENTOS DEL SISTEMA FINANCIERO', 'COHORTE  2025', 'ago', '3.MAQUETACIÓN', 19),
  pos(DE, 'EP00128', 'HERRAMIENTAS CONTABLES', 'COHORTE  2026', 'ago', '5.FINALIZADA', 8),
  pos(DE, 'EP00046', 'ANÁLISIS ESTRATÉGICO DE LOS MERCADOS', 'COHORTE  2026', 'ago', '5.FINALIZADA', 6),
  pos(DE, 'EP00878', 'REFLEXIÓN Y ANÁLISIS ESTRATÉGICO', 'COHORTE  2026 - 2', 'ago', '5.FINALIZADA', 1),
  pos(DE, 'EP02618', 'ENTORNO CULTURAL, SOCIAL, POLÍTICO Y ECONÓMICO', 'COHORTE  2026 - 2', 'ago', '5.FINALIZADA', 2),
  pos(AG, 'EP01026', 'SEMINARIO II: ADQUISICIÓN DE INVERSIONES', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS', 12),
  // transversal: mismo código en dos carreras
  pos(AG, 'EP00461', 'TALLERES DE APOYO PARA LA REALIZACIÓN DEL TRABAJO FINAL', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS', 9),
  pos(DE, 'EP00461', 'TALLERES DE APOYO PARA LA REALIZACIÓN DEL TRABAJO FINAL', 'COHORTE  2025', 'ago', '2.CONSTRUCCIÓN DE CONTENIDOS', 4),
  pos(CY, 'EP00459', 'FINANZAS Y CONTABILIDAD PARA LA TECNOLOGÍA', 'COHORTE  2026', 'ago', '5.FINALIZADA', 2),
  pos(CY, 'EP01898', 'ESTRATEGIA EXPONENCIAL', 'COHORTE  2026', 'ago', '5.FINALIZADA', 1),
  pos(CY, 'EP01487', 'LIDERAZGO DIGITAL Y TOMA DE DECISIONES', 'COHORTE  2026', 'ago', '5.FINALIZADA', 3),
  pos(DP, 'EP02034', 'IDEACIÓN DE SOLUCIONES', 'COHORTE  2026', 'ago', '5.FINALIZADA', 5),

  // ---- Septiembre 2026 (inscripción a tres semanas)
  pos(DE, 'EP01864', 'SEMINARIO I', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS', 18),
  pos(DE, 'EP00728', 'HABILIDADES Y COMPETENCIAS DIRECTIVAS', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS', 20),
  pos(DE, 'EP01155', 'SISTEMAS DE INFORMACIÓN PARA LA CREACIÓN DE VALOR', 'COHORTE  2026', 'sep', '5.FINALIZADA', 5),
  pos(DE, 'EP02044', 'SATISFACTORES Y CANALES: EL MARKETING DE LA EXPERIENCIA DEL CLIENTE', 'COHORTE  2026', 'sep', '5.FINALIZADA', 10),
  pos(DE, 'EP02397', 'HERRAMIENTAS MATEMÁTICAS', 'COHORTE  2026 - 2', 'sep', '5.FINALIZADA', 7),
  pos(DE, 'EP01180', 'GESTIÓN ESTRATÉGICA DEL TALENTO', 'COHORTE  2026 - 2', 'sep', '5.FINALIZADA', 3),
  pos(AG, 'EP01158', 'SEMINARIO III', 'COHORTE  2025', 'sep', '2.CONSTRUCCIÓN DE CONTENIDOS', 13),
  pos(CY, 'EP00688', 'GESTIÓN DE OPERACIONES EN TI', 'COHORTE  2026', 'sep', '5.FINALIZADA', 8),
  pos(CY, 'EP01850', 'APRENDIZAJE AUTOMÁTICO E INTELIGENCIA ARTIFICIAL PARA LÍDERES TECNOLÓGICOS/AS', 'COHORTE  2026', 'sep', '3.MAQUETACIÓN', 6),
  pos(DP, 'EP02035', 'PLANIFICACIÓN Y GESTIÓN DE LAS ENTREGAS', 'COHORTE  2026', 'sep', '3.MAQUETACIÓN', 6),

  // ---- Octubre 2026 (todavía lejos: gris)
  pos(DE, 'EP00971', 'EL PRICING Y EL ABORDAJE ESTRATÉGICO DE LOS MERCADOS', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 21),
  pos(DE, 'EP00596', 'INNOVACIÓN EN MODELOS DE NEGOCIOS, SATISFACTORES Y PROCESOS', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 15),
  pos(DE, 'EP00402', 'ANÁLISIS FINANCIERO PARA LA TOMA DE DECISIONES', 'COHORTE  2026', 'oct', '5.FINALIZADA', 9),
  pos(AG, 'EP00720', 'CREACIÓN DE VALOR EN LA ECONOMÍA DE LA EXPERIENCIA', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 16),
  pos(CY, 'EP00614', 'DERECHO ESTRATÉGICO', 'COHORTE  2026', 'oct', '5.FINALIZADA', 4),
  // transversal en tres carreras
  pos(CY, 'EP01869', 'SUSTENTABILIDAD Y ODS', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 9),
  pos(AG, 'EP01869', 'SUSTENTABILIDAD Y ODS', 'COHORTE  2025', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 7),
  pos(DP, 'EP01869', 'SUSTENTABILIDAD Y ODS', 'COHORTE  2026', 'oct', '2.CONSTRUCCIÓN DE CONTENIDOS', 4),

  // ---- Noviembre 2026
  pos(DE, 'EP00582', 'SELECCIÓN Y OPTIMIZACIÓN DE INVERSIONES', 'COHORTE  2025', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS', 23),
  pos(DE, 'EP00209', 'GESTIÓN PRESUPUESTARIA Y DEL CAPITAL DE TRABAJO', 'COHORTE  2026', 'nov', '5.FINALIZADA', 12),
  pos(AG, 'EP00031', 'INNOVACIÓN ABIERTA', 'COHORTE  2025', 'nov', '5.FINALIZADA', 20),
  pos(AG, 'EP02043', 'DIRECCIÓN DE PROYECTOS INTEGRADOS', 'COHORTE  2025', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS', 18),
  pos(CY, 'EP02040', 'SEMINARIO I: GESTIÓN DE PRODUCTOS Y SERVICIOS', 'COHORTE  2026', 'nov', '5.FINALIZADA', 11),
  pos(DP, 'EP02036', 'GESTIÓN DEL RIESGO Y LA INCERTIDUMBRE', 'COHORTE  2026', 'nov', '2.CONSTRUCCIÓN DE CONTENIDOS', 8),

  // ---- Educación: los períodos no vienen en la planilla, se generan desde las fechas
  edu('Educación Inicial', '1210134', 'EDUCACIÓN INCLUSIVA. PERSPECTIVAS DESDE EL DISEÑO UNIVERSAL', 'COHORTE  3', 'Bimestral', [2026, 2, 4], '5.FINALIZADA', 10),
  edu('Educación Inicial', '1220092', 'LA DIDÁCTICA DE LA LITERATURA Y ALFABETIZACIÓN INICIAL', 'COHORTE  3', 'Bimestral', [2026, 2, 4], '5.FINALIZADA', 11),
  edu('Educación Inicial', '1220094', 'LA DIDÁCTICA DE LAS CIENCIAS SOCIALES EN LA EDUCACIÓN INICIAL', 'COHORTE  3', 'Bimestral', [2026, 2, 4], '5.FINALIZADA', 12),
  edu('Educación Inicial', '1210102', 'ANTROPOLOGÍA FILOSÓFICA', 'COHORTE  3', 'Bimestral', [2026, 4, 13], '5.FINALIZADA', 13),
  edu('Educación Inicial', '1210138', 'INVESTIGACIÓN E INNOVACIÓN EDUCATIVA', 'COHORTE  3', 'Bimestral', [2026, 4, 13], '5.FINALIZADA', 14),
  edu('Educación Inicial', '1210136', 'EXPERIENCIAS ESTÉTICAS, LENGUAJES ARTÍSTICOS EXPRESIVOS EN LA EDUCACIÓN INICIAL', 'COHORTE  3', 'Bimestral', [2026, 4, 13], '3.MAQUETACIÓN', 15),
  edu('Educación Inicial', '1210139', 'PASTORAL EDUCATIVA', 'COHORTE  4', 'Bimestral', [2026, 7, 5], '2.CONSTRUCCIÓN DE CONTENIDOS', 16),
  edu('Educación Inicial', '1210140', 'TRABAJO FINAL', 'COHORTE  4', 'Bimestral', [2026, 7, 5], '1.CONTRATACIÓN', 17),
  edu('Ciencias de la Educación', '1210117', 'GESTIÓN CURRICULAR II', 'COHORTE  3', 'Cuatrimestral', [2026, 2, 4], '5.FINALIZADA', 9),
  edu('Ciencias de la Educación', '1210118', 'RESIDENCIA PEDAGÓGICA II', 'COHORTE  3', 'Cuatrimestral', [2026, 2, 4], '5.FINALIZADA', 10),
  edu('Ciencias de la Educación', '1210119', 'GESTIÓN DE LAS INSTITUCIONES EDUCATIVAS', 'COHORTE  3', 'Bimestral', [2026, 4, 13], '5.FINALIZADA', 11),
  edu('Ciencias de la Educación', '1210116', 'DIDÁCTICA', 'COHORTE  4', 'Bimestral', [2026, 7, 5], '3.MAQUETACIÓN', 3),
  edu('Ciencias de la Educación', '1220084', 'GESTIÓN CURRICULAR I', 'COHORTE  4', 'Cuatrimestral', [2026, 7, 5], '2.CONSTRUCCIÓN DE CONTENIDOS', 4),
]

// Docentes y asesores tal como figuran en el tablero de contratación
const tablero: FilaTablero[] = [
  { codigo: 'EP02149', carrera: CI, docente: 'Micaela Nancy Cerezoli y Natalia Alejandra Sánchez', asesor: 'Yamile Abed', estado: 'construccion' },
  { codigo: 'EP01396', carrera: DE, docente: 'Sánchez, Gabriel Leandro', asesor: null, estado: 'maquetacion' },
  { codigo: 'EP00128', carrera: DE, docente: 'Santiago Martín', asesor: 'Jorgelina Rodriguez Jauregui', estado: 'finalizacion' },
  { codigo: 'EP00046', carrera: DE, docente: 'Juan Pablo Mon', asesor: 'Evelin Pineda', estado: 'finalizacion' },
  { codigo: 'EP00878', carrera: DE, docente: 'Ana Fité - Virginia Rosales Paur', asesor: 'Marcelo Hangshel Pentimalli', estado: 'finalizacion' },
  { codigo: 'EP02618', carrera: DE, docente: 'Gisela Veritier', asesor: 'Lucía Rodriguez', estado: 'finalizacion' },
  { codigo: 'EP01026', carrera: AG, docente: 'Maira Calzada', asesor: 'Victoria Coria', estado: 'construccion' },
  { codigo: 'EP00461', carrera: DE, docente: 'Giovanardi Mariana Alejandra', asesor: 'Anahí Azcuy', estado: 'construccion' },
  { codigo: 'EP00459', carrera: CY, docente: 'Lucas Matias Elettore', asesor: 'Evelin Pineda', estado: 'finalizacion' },
  { codigo: 'EP01898', carrera: CY, docente: 'Gisela Veritier e Inés Anciola', asesor: 'Lucía Rodriguez', estado: 'finalizacion' },
  { codigo: 'EP01487', carrera: CY, docente: 'Carlos Luis Spontón', asesor: 'Evelin Pineda', estado: 'finalizacion' },
  { codigo: 'EP01864', carrera: DE, docente: 'Barrientos', asesor: 'Victoria Coria', estado: 'construccion' },
  { codigo: 'EP00728', carrera: DE, docente: 'Claudia Martinez', asesor: 'Victoria Coria', estado: 'construccion' },
  { codigo: 'EP01155', carrera: DE, docente: 'Marcelo Hangshel Pentimalli', asesor: 'Lucía Rodriguez', estado: 'finalizacion' },
  { codigo: 'EP02044', carrera: DE, docente: 'Daniel Bordabossana', asesor: 'Florencia Palpacelli', estado: 'finalizacion' },
  { codigo: 'EP02397', carrera: DE, docente: 'Valentina Pulcini', asesor: 'Lucía Rodriguez', estado: 'finalizacion' },
  { codigo: 'EP01180', carrera: DE, docente: 'Elena Colasanti', asesor: 'Jorgelina Rodriguez Jauregui', estado: 'finalizacion' },
  { codigo: 'EP01158', carrera: AG, docente: 'Luciano Crisafulli', asesor: 'Victoria Coria', estado: 'construccion' },
  { codigo: 'EP00688', carrera: CY, docente: 'Ignacio Casanovas', asesor: 'Evelin Pineda', estado: 'finalizacion' },
  { codigo: 'EP00971', carrera: DE, docente: 'D´ESPOSITO, HORACIO', asesor: null, estado: 'construccion' },
  { codigo: 'EP00596', carrera: DE, docente: 'Cristian Balmaceda', asesor: 'Yamile Abed', estado: 'construccion' },
  { codigo: 'EP00402', carrera: DE, docente: 'Gabriel Feldman', asesor: 'Adriana Hermosilla', estado: 'finalizacion' },
  { codigo: 'EP00720', carrera: AG, docente: 'Yéssica Sepúlveda', asesor: 'Yamile Abed', estado: 'construccion' },
  { codigo: 'EP00614', carrera: CY, docente: 'Juan Sebastián Querro', asesor: 'Evelin Pineda', estado: 'finalizacion' },
  { codigo: 'EP00582', carrera: DE, docente: 'OLIVO SERGIO LUIS', asesor: null, estado: 'construccion' },
  { codigo: 'EP00209', carrera: DE, docente: 'Mario Perossa', asesor: 'Adriana Hermosilla', estado: 'finalizacion' },
  { codigo: 'EP02043', carrera: AG, docente: 'Adriana Pérez', asesor: 'Victoria Coria', estado: 'construccion' },
  { codigo: 'EP02040', carrera: CY, docente: 'Sandra Aronica', asesor: 'Victoria Coria', estado: 'maquetacion' },
]

/**
 * El plan de estudios completo, sin período: son todas las asignaturas de la
 * carrera, incluidas las que el director todavía tiene que ubicar. Las que ya
 * tienen período lo reciben por `filas`; acá se define el orden en el plan.
 */
function filasDelPlan(): FilaAsignatura[] {
  const sinFechas = {
    inicioCursado: null, aperturaInscripcion: null, cierreInscripcion: null,
    finCursado: null, aperturaAfi: null, cierreAfi: null, cierreAsignatura: null, actas: null,
  }
  return PLANES_POSGRADO
    .map(([carrera, codigo, nombre, orden, estado, docente, asesor]) => ({
      unidad: 'posgrado' as const,
      carrera, cohorte: null, codigo, nombre,
      catedra: 'DA', cargaHoraria: null, orden, duracion: null,
      estadoOrigen: estado, periodoNombre: null,
      fechas: { ...sinFechas },
      _docente: docente, _asesor: asesor,
    })) as FilaAsignatura[]
}

async function main() {
  // Base limpia para que el demo sea reproducible
  await prisma.cambio.deleteMany({})
  await prisma.aperturaCohorte.deleteMany({})
  await prisma.apertura.deleteMany({})
  await prisma.planItem.deleteMany({})
  await prisma.cohorte.deleteMany({})
  await prisma.periodo.deleteMany({})
  await prisma.usuarioCarrera.deleteMany({})
  await prisma.asignatura.deleteMany({})
  await prisma.carrera.deleteMany({})

  // Docentes y asesores de los planes, para no perderlos al cargar el catálogo
  const delPlan: FilaTablero[] = PLANES_POSGRADO
    .filter(([, , , , , docente, asesor]) => docente || asesor)
    .map(([carrera, codigo, , , estado, docente, asesor]) => ({
      codigo, carrera,
      docente: docente || null,
      asesor: asesor || null,
      estado: 'sin_novedad' as const, // el estado real ya viene en estadoOrigen
    }))

  // primero el plan (define el orden), después las que ya tienen período
  const r = await cargar([...filasDelPlan(), ...filas], [...delPlan, ...tablero], prisma)
  console.log('Demo cargada:', r)
  const porCarrera = await prisma.carrera.findMany({
    include: { _count: { select: { planItems: true } } },
    orderBy: { nombre: 'asc' },
  })
  console.log('\nPlan de estudios por carrera:')
  for (const c of porCarrera) console.log(`  ${c.nombre.padEnd(36)} ${c._count.planItems} asignaturas`)
  await prisma.$disconnect()
}

main()
