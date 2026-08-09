/**
 * Maestrías de Nuevas Tecnologías.
 *
 * Son TRES carreras distintas que comparten un tronco común y después divergen.
 * El tablero de contratación las tiene fusionadas en una sola "Nuevas
 * Tecnologías" de 46 asignaturas; acá se separan como corresponde.
 *
 * Una asignatura del tronco común aparece en los tres planes con el mismo
 * código: el sistema la trata como una sola (igual que cualquier transversal),
 * así que su estado de producción se carga una vez y vale para las tres.
 *
 * PENDIENTE: reemplazar con los planes de estudio reales. El corte entre el
 * tronco común y las asignaturas propias de Alta Gerencia está sin confirmar
 * — Goni va a pasar los planes oficiales.
 */

export const NT_ALTA_GERENCIA = 'NT - Alta Gerencia'
export const NT_CYBERSEGURIDAD = 'NT - Cyberseguridad'
export const NT_FINANZAS = 'NT - Finanzas Tecnológicas'

export const CARRERAS_NT = [NT_ALTA_GERENCIA, NT_CYBERSEGURIDAD, NT_FINANZAS]

/** Códigos del tronco común, en orden. Los cursan las tres maestrías. */
export const TRONCO_COMUN: string[] = [
  'EP01898', // 1 Estrategia exponencial
  'EP00459', // 2 Finanzas y contabilidad para la tecnología
  'EP01487', // 3 Liderazgo digital y toma de decisiones
  'EP00614', // 4 Derecho estratégico
  'EP00461', // 5 Talleres de apoyo para la realización del trabajo final
  'EP01850', // 6 Aprendizaje automático e IA para líderes tecnológicos/as
  'EP01455', // 7 La tecnología y el derecho
  'EP00688', // 8 Gestión de operaciones en TI
  'EP01869', // 9 Sustentabilidad y ODS
  'PLAN-10', // 10 Ética, cumplimiento corporativo y perspectiva ignaciana
  'EP02040', // 11 Seminario I: gestión de productos y servicios
  'EP01026', // 12 Seminario II: adquisición de inversiones
  'EP01158', // 13 Seminario III
  'EP02069', // 14 Agilidad y transformación organizacional
  'EP02033', // 15 Recursos humanos y analítica de datos
  'EP00720', // 16 Creación de valor en la economía de la experiencia
]

/** Propias de cada maestría, después del tronco. Continúan la numeración. */
export const ESPECIFICAS: Record<string, string[]> = {
  [NT_ALTA_GERENCIA]: [
    'EP01051', // Comportamiento organizacional en la gestión de la tecnología
    'EP02043', // Dirección de proyectos integrados
    'EP01007', // El marketing de la experiencia de clientes (CX)
    'EP00031', // Innovación abierta
    'PLAN-21', // Cadenas globales de valor y nuevas industrias
    'EP02197', // El camino de los unicornios
    'EP01662', // Capital de riesgo corporativo
    'EP01282', // Desarrollo y competitividad
    'EP00827', // Trabajo final
  ],
  [NT_CYBERSEGURIDAD]: [
    'EP00121', // Legislación en tecnologías y propiedad intelectual
    'EP01676', // Estrategia de ciberseguridad y respuesta ejecutiva
    'EP00750', // Seguridad de la información empresarial
    'EP00783', // Arquitectura moderna de base de datos
    'EP00622', // Cadena de bloques
    'EP01392', // Inteligencia artificial aplicada I
    'EP02194', // Analítica y minería de datos
    'EP00411', // Configuraciones, procesos y tecnologías
    'EP02079', // Inteligencia artificial aplicada II
    'EP00337', // Ciber delito
    'EP00827', // Trabajo final
  ],
  [NT_FINANZAS]: [
    'PLAN-35', // Reingeniería y ciclo de vida de desarrollo de sistemas
    'PLAN-36', // Introducción a las finanzas tecnológicas
    'PLAN-37', // Introducción a los seguros tecnológicos
    'PLAN-38', // Finanzas digitales y finanzas alternativas
    'PLAN-39', // Marcos regulatorios de las finanzas tecnológicas
    'PLAN-40', // Marcos regulatorios de los seguros tecnológicos
    'PLAN-41', // Internet de las cosas aplicado al ecosistema
    'PLAN-42', // Inteligencia artificial aplicada I
    'PLAN-43', // Cadena de bloques aplicada
    'PLAN-44', // Comercialización digital
    'PLAN-45', // Inteligencia artificial aplicada II
    'EP00827', // Trabajo final
  ],
}

/** El plan de cada maestría: tronco común + sus propias, numerado de corrido. */
export function planDe(carrera: string): { codigo: string; orden: number }[] {
  return [...TRONCO_COMUN, ...(ESPECIFICAS[carrera] ?? [])]
    .map((codigo, i) => ({ codigo, orden: i + 1 }))
}
