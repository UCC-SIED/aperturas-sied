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

  it('educación sin fecha de inicio va al reporte', async () => {
    const r = await cargar(
      [fila({ unidad: 'educacion', carrera: 'ED X', codigo: 'EDU003', nombre: 'SIN FECHA', periodoNombre: null,
        fechas: { ...fila({}).fechas, inicioCursado: null } })],
      [], prisma,
    )
    expect(r.sinPeriodo).toEqual(['SIN FECHA (ED X)'])
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
