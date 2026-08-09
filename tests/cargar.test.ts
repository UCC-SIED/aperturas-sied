import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { cargar } from '../migracion/cargar'
import type { FilaAsignatura } from '../migracion/parsers/tipos'

const fila = (extra: Partial<FilaAsignatura>): FilaAsignatura => ({
  unidad: 'posgrado', carrera: 'TEST CARRERA', cohorte: 'COHORTE  2025',
  codigo: 'TST001', nombre: 'ASIGNATURA TEST', catedra: null, cargaHoraria: null,
  orden: 1, duracion: null, estadoOrigen: '5.FINALIZADA', periodoNombre: 'Mensual_Test_2026',
  fechas: { inicioCursado: new Date(2026, 7, 5), aperturaInscripcion: new Date(2026, 6, 26),
    cierreInscripcion: null, finCursado: null, aperturaAfi: null, cierreAfi: null,
    cierreAsignatura: null, actas: null },
  ...extra,
})

async function limpiar() {
  await prisma.aperturaCohorte.deleteMany({})
  await prisma.apertura.deleteMany({})
  await prisma.planItem.deleteMany({})
  await prisma.cohorte.deleteMany({})
  await prisma.periodo.deleteMany({})
  await prisma.asignatura.deleteMany({})
  await prisma.carrera.deleteMany({})
}

describe('cargar', () => {
  beforeAll(limpiar)
  afterAll(async () => { await limpiar(); await prisma.$disconnect() })

  it('carga asignaturas, períodos y aperturas, y reporta filas sin código', async () => {
    const reporte = await cargar(
      [fila({}), fila({ codigo: null, nombre: 'HUERFANA' })],
      [{ codigo: 'TST001', carrera: 'TEST CARRERA', docente: 'Doc Test', asesor: 'Ase Test', estado: 'maquetacion' }],
      prisma,
    )
    expect(reporte.asignaturas).toBe(1)
    expect(reporte.aperturas).toBe(1)
    expect(reporte.sinCodigo).toEqual(['HUERFANA (TEST CARRERA)'])
    const a = await prisma.asignatura.findUnique({ where: { codigo: 'TST001' } })
    expect(a?.docente).toBe('Doc Test')
    expect(a?.estado).toBe('finalizacion') // la planilla dice finalizada; el tablero no pisa
    const ap = await prisma.apertura.findFirst({ where: { asignaturaCodigo: 'TST001' }, include: { periodo: true, cohortes: { include: { cohorte: true } } } })
    expect(ap?.periodo.nombre).toBe('Mensual_Test_2026')
    expect(ap?.cohortes.map((c) => c.cohorte.nombre)).toEqual(['COHORTE  2025'])
  })

  it('es idempotente (correr dos veces no duplica)', async () => {
    await cargar([fila({})], [], prisma)
    expect(await prisma.apertura.count()).toBe(1)
    expect(await prisma.periodo.count()).toBe(1)
  })

  it('educación: genera períodos desde las fechas y agrupa cercanas', async () => {
    const e1 = fila({ unidad: 'educacion', carrera: 'ED INICIAL', codigo: 'EDU001', nombre: 'PEDAGOGÍA',
      periodoNombre: null, duracion: 'Bimestral',
      fechas: { ...fila({}).fechas, inicioCursado: new Date(2026, 4, 6) } })
    const e2 = fila({ unidad: 'educacion', carrera: 'ED PRIMARIA', codigo: 'EDU002', nombre: 'DIDÁCTICA',
      periodoNombre: null, duracion: 'Bimestral',
      fechas: { ...fila({}).fechas, inicioCursado: new Date(2026, 4, 7) } }) // un día después: mismo período
    const r = await cargar([e1, e2], [], prisma)
    expect(r.sinPeriodo).toEqual([])
    const periodosEdu = await prisma.periodo.findMany({ where: { unidadId: 'educacion' } })
    expect(periodosEdu).toHaveLength(1)
    expect(periodosEdu[0].tipo).toBe('bimestral')
  })

  it('educación: bimestral y cuatrimestral que arrancan el mismo día son períodos distintos', async () => {
    const base = fila({}).fechas
    const bim = fila({ unidad: 'educacion', carrera: 'ED CS', codigo: 'EDU010', nombre: 'PEDAGOGÍA: TEORÍA Y PRÁCTICA',
      periodoNombre: null, duracion: 'Bimestral',
      fechas: { ...base, inicioCursado: new Date(2026, 7, 6) } })
    const cua = fila({ unidad: 'educacion', carrera: 'ED CS', codigo: 'EDU011', nombre: 'GESTIÓN CURRICULAR I',
      periodoNombre: null, duracion: 'Cuatrimestral',
      fechas: { ...base, inicioCursado: new Date(2026, 7, 6) } })
    await cargar([bim, cua], [], prisma)
    const periodos = await prisma.periodo.findMany({
      where: { unidadId: 'educacion', inicioCursado: new Date(2026, 7, 6) },
      include: { aperturas: true },
    })
    expect(periodos).toHaveLength(2)
    expect(periodos.map((p) => p.tipo).sort()).toEqual(['bimestral', 'cuatrimestral'])
    const dePeriodo = (tipo: string) =>
      periodos.find((p) => p.tipo === tipo)!.aperturas.map((a) => a.asignaturaCodigo)
    expect(dePeriodo('bimestral')).toEqual(['EDU010'])
    expect(dePeriodo('cuatrimestral')).toEqual(['EDU011'])
  })

  it('usa el calendario oficial de Educación en vez de inventar períodos', async () => {
    await limpiar() // este test verifica el set completo de períodos
    const calendario = [
      { nombre: 'Bimestre A', tipo: 'bimestral' as const, mes: 'Marzo',
        inicioCursado: new Date(2026, 2, 4), aperturaInscripcion: new Date(2026, 1, 23),
        cierreInscripcion: new Date(2026, 2, 1), finCursado: new Date(2026, 3, 25),
        aperturaAfi: new Date(2026, 3, 9), cierreAfi: new Date(2026, 3, 23),
        cierreAsignatura: new Date(2026, 3, 29), actas: new Date(2026, 4, 2) },
      { nombre: 'Cuatrimestral A', tipo: 'cuatrimestral' as const, mes: 'Marzo',
        inicioCursado: new Date(2026, 2, 4), aperturaInscripcion: new Date(2026, 1, 23),
        cierreInscripcion: new Date(2026, 2, 1), finCursado: new Date(2026, 5, 13),
        aperturaAfi: new Date(2026, 4, 28), cierreAfi: new Date(2026, 5, 11),
        cierreAsignatura: new Date(2026, 5, 17), actas: new Date(2026, 5, 20) },
    ]
    const base = fila({}).fechas
    const b = fila({ unidad: 'educacion', carrera: 'ED CAL', codigo: 'EDU100', nombre: 'UNA BIMESTRAL',
      periodoNombre: null, duracion: 'Bimestral', fechas: { ...base, inicioCursado: new Date(2026, 2, 4) } })
    const c = fila({ unidad: 'educacion', carrera: 'ED CAL', codigo: 'EDU101', nombre: 'UNA CUATRIMESTRAL',
      periodoNombre: null, duracion: 'Cuatrimestral', fechas: { ...base, inicioCursado: new Date(2026, 2, 4) } })

    await cargar([b, c], [], prisma, calendario)

    const periodos = await prisma.periodo.findMany({ where: { unidadId: 'educacion' } })
    // sólo los dos del calendario: no se inventó ninguno
    expect(periodos.map((p) => p.nombre).sort()).toEqual(['Bimestre A', 'Cuatrimestral A'])
    // el período trae su ciclo completo, base para calcular las fechas de cada aula
    const bimA = periodos.find((p) => p.nombre === 'Bimestre A')!
    expect(bimA.aperturaAfi).toEqual(new Date(2026, 3, 9))
    expect(bimA.actas).toEqual(new Date(2026, 4, 2))
    // cada asignatura cayó en el período de su duración
    const ap = await prisma.apertura.findMany({ include: { periodo: true } })
    expect(ap.find((a) => a.asignaturaCodigo === 'EDU100')!.periodo.nombre).toBe('Bimestre A')
    expect(ap.find((a) => a.asignaturaCodigo === 'EDU101')!.periodo.nombre).toBe('Cuatrimestral A')
  })

  it('carga el plan de estudios completo, con y sin período', async () => {
    await limpiar()
    const planes = [
      { unidad: 'posgrado' as const, carrera: 'CARRERA PLAN', codigo: 'PL001', nombre: 'PRIMERA', orden: 1 },
      { unidad: 'posgrado' as const, carrera: 'CARRERA PLAN', codigo: 'PL002', nombre: 'SEGUNDA', orden: 2 },
      { unidad: 'posgrado' as const, carrera: 'CARRERA PLAN', codigo: 'PL003', nombre: 'TERCERA', orden: 3 },
    ]
    // sólo una de las tres tiene período asignado
    const conPeriodo = fila({ carrera: 'CARRERA PLAN', codigo: 'PL002', nombre: 'SEGUNDA', orden: null })

    const r = await cargar([conPeriodo], [], prisma, [], planes)

    const carrera = await prisma.carrera.findFirst({ where: { nombre: 'CARRERA PLAN' } })
    const plan = await prisma.planItem.findMany({
      where: { carreraId: carrera!.id }, orderBy: { orden: 'asc' },
    })
    expect(plan.map((p) => [p.asignaturaCodigo, p.orden])).toEqual([
      ['PL001', 1], ['PL002', 2], ['PL003', 3],
    ])
    // sólo la que tenía período generó apertura
    expect(r.aperturas).toBe(1)
    // las del plan sin período no ensucian el reporte
    expect(r.sinPeriodo).toEqual([])
  })

  it('educación sin fecha de inicio va al reporte', async () => {
    const r = await cargar(
      [fila({ unidad: 'educacion', carrera: 'ED X', codigo: 'EDU003', nombre: 'SIN FECHA', periodoNombre: null,
        fechas: { ...fila({}).fechas, inicioCursado: null } })],
      [], prisma,
    )
    expect(r.sinPeriodo).toEqual(['SIN FECHA (ED X)'])
  })

  it('reporta fechas incoherentes pero carga la fila igual', async () => {
    const r = await cargar(
      [fila({ codigo: 'TST020', nombre: 'CON FECHAS MAL',
        fechas: { ...fila({}).fechas,
          inicioCursado: new Date(2026, 7, 5),
          aperturaInscripcion: new Date(2026, 7, 20), // abre después de empezar
        } })],
      [], prisma,
    )
    expect(r.fechasIncoherentes).toHaveLength(1)
    expect(r.fechasIncoherentes[0]).toContain('CON FECHAS MAL')
    expect(r.fechasIncoherentes[0]).toContain('la inscripción abre después de empezar el cursado')
    // se cargó igual: el sistema no descarta datos, los marca
    expect(await prisma.asignatura.findUnique({ where: { codigo: 'TST020' } })).not.toBeNull()
  })

  it('nombres en conflicto: gana el más largo y queda reportado', async () => {
    const r = await cargar(
      [fila({ codigo: 'TST009', nombre: 'SEMINARIO I' }),
       fila({ codigo: 'TST009', nombre: 'SEMINARIO I: GESTIÓN DE PRODUCTOS' })],
      [], prisma,
    )
    expect(r.nombresEnConflicto).toHaveLength(1)
    const a = await prisma.asignatura.findUnique({ where: { codigo: 'TST009' } })
    expect(a?.nombre).toBe('SEMINARIO I: GESTIÓN DE PRODUCTOS')
  })
})
