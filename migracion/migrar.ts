import { readFileSync, writeFileSync, existsSync } from 'fs'
import { prisma } from '../src/lib/db'
import { parsePosgrado } from './parsers/posgrado'
import { parseEducacion } from './parsers/educacion'
import { parseTablero } from './parsers/tablero'
import { parsePeriodosEducacion } from './parsers/periodos'
import { parsePlanes } from './parsers/planes'
import { cargar } from './cargar'

async function main() {
  const dir = 'migracion/input'
  const filas = [
    ...(existsSync(`${dir}/posgrado.xlsx`) ? parsePosgrado(readFileSync(`${dir}/posgrado.xlsx`)) : []),
    ...(existsSync(`${dir}/educacion.xlsx`) ? parseEducacion(readFileSync(`${dir}/educacion.xlsx`)) : []),
  ]
  const tablero = existsSync(`${dir}/tablero.json`)
    ? parseTablero(readFileSync(`${dir}/tablero.json`, 'utf8'))
    : []
  // Calendario oficial de Educación (Bimestre A, Cuatrimestral A, ...). Si falta,
  // los períodos se infieren de las fechas de cada asignatura.
  const calendario = existsSync(`${dir}/periodos-educacion.xlsx`)
    ? parsePeriodosEducacion(readFileSync(`${dir}/periodos-educacion.xlsx`))
    : []
  // Planes de estudio completos: el catálogo de cada carrera, con o sin período
  const planes = existsSync(`${dir}/planes.xlsx`)
    ? parsePlanes(readFileSync(`${dir}/planes.xlsx`))
    : []
  if (!filas.length && !planes.length) {
    console.error(
      'No hay archivos en migracion/input/. Se esperan (todos opcionales, pero al menos uno):\n' +
      '  planes.xlsx              planes de estudio de todas las carreras\n' +
      '  posgrado.xlsx            planilla de aperturas de Posgrado\n' +
      '  educacion.xlsx           planilla de aperturas de Educación\n' +
      '  periodos-educacion.xlsx  calendario de períodos de Educación\n' +
      '  tablero.json             respaldo del tablero de contratación',
    )
    process.exit(1)
  }
  console.log(
    `Aperturas leídas: ${filas.length} · Plan de estudios: ${planes.length} · ` +
    `Tablero: ${tablero.length} · Períodos de Educación: ${calendario.length}`,
  )
  const r = await cargar(filas, tablero, prisma, calendario, planes)
  const md = [
    `# Reporte de migración — ${new Date().toLocaleString('es-AR')}`,
    '',
    `- Asignaturas cargadas: ${r.asignaturas}`,
    `- Aperturas cargadas: ${r.aperturas}`,
    '',
    `## Filas sin código (no cargadas: ${r.sinCodigo.length})`,
    ...r.sinCodigo.map((s) => `- ${s}`),
    '',
    `## Sin período asignable (revisar a mano: ${r.sinPeriodo.length})`,
    ...r.sinPeriodo.map((s) => `- ${s}`),
    '',
    `## Códigos con nombres en conflicto (${r.nombresEnConflicto.length})`,
    ...r.nombresEnConflicto.map((s) => `- ${s}`),
    '',
    `## Fechas incoherentes — se cargaron igual, pero hay que revisarlas (${r.fechasIncoherentes.length})`,
    ...r.fechasIncoherentes.map((s) => `- ${s}`),
  ].join('\n')
  writeFileSync('migracion/reporte-migracion.md', md)
  console.log(`\nAsignaturas: ${r.asignaturas} · Aperturas: ${r.aperturas}`)
  console.log(`A revisar → sin código: ${r.sinCodigo.length} · sin período: ${r.sinPeriodo.length} · nombres en conflicto: ${r.nombresEnConflicto.length} · fechas incoherentes: ${r.fechasIncoherentes.length}`)
  console.log('\nDetalle completo en migracion/reporte-migracion.md')
  await prisma.$disconnect()
}

main()
