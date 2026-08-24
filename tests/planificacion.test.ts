import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { agregar, quitar, mover } from '@/lib/planificacion'
import type { Sesion } from '@/lib/permisos'

// Escenario: una transversal compartida por dos carreras, y dos períodos.
let carreraA: number, carreraB: number
let cohorteA: number, cohorteB: number
let periodo1: number, periodo2: number
let usuarioA: Sesion, usuarioB: Sesion, sied: Sesion

async function limpiar() {
  await prisma.cambio.deleteMany({})
  await prisma.aperturaCohorte.deleteMany({})
  await prisma.apertura.deleteMany({})
  await prisma.planItem.deleteMany({})
  await prisma.cohorte.deleteMany({})
  await prisma.periodo.deleteMany({})
  await prisma.asignatura.deleteMany({})
  await prisma.usuarioCarrera.deleteMany({})
  await prisma.usuario.deleteMany({})
  await prisma.carrera.deleteMany({})
}

beforeEach(async () => {
  await limpiar()
  await prisma.unidad.upsert({ where: { id: 'posgrado' }, update: {}, create: { id: 'posgrado', nombre: 'Posgrado' } })

  const a = await prisma.carrera.create({ data: { nombre: 'CARRERA A', unidadId: 'posgrado' } })
  const b = await prisma.carrera.create({ data: { nombre: 'CARRERA B', unidadId: 'posgrado' } })
  carreraA = a.id
  carreraB = b.id

  cohorteA = (await prisma.cohorte.create({ data: { nombre: 'COHORTE A', carreraId: carreraA } })).id
  cohorteB = (await prisma.cohorte.create({ data: { nombre: 'COHORTE B', carreraId: carreraB } })).id

  // transversal: figura en los dos planes
  await prisma.asignatura.create({ data: { codigo: 'TRANS1', nombre: 'ASIGNATURA COMPARTIDA', estado: 'construccion' } })
  await prisma.planItem.create({ data: { carreraId: carreraA, asignaturaCodigo: 'TRANS1', orden: 3 } })
  await prisma.planItem.create({ data: { carreraId: carreraB, asignaturaCodigo: 'TRANS1', orden: 8 } })

  periodo1 = (await prisma.periodo.create({
    data: {
      unidadId: 'posgrado', nombre: 'Mensual_Uno', tipo: 'mensual',
      inicioCursado: new Date(2026, 8, 9), aperturaInscripcion: new Date(2026, 7, 30),
      cierreInscripcion: new Date(2026, 8, 6), finCursado: new Date(2026, 9, 9),
      aperturaAfi: new Date(2026, 9, 10), cierreAfi: new Date(2026, 9, 31),
      cierreAsignatura: new Date(2026, 10, 9), actas: new Date(2026, 10, 12),
    },
  })).id
  periodo2 = (await prisma.periodo.create({
    data: {
      unidadId: 'posgrado', nombre: 'Mensual_Dos', tipo: 'mensual',
      inicioCursado: new Date(2026, 9, 7), aperturaInscripcion: new Date(2026, 8, 27),
    },
  })).id

  const uA = await prisma.usuario.create({ data: { email: 'a@ucc.edu.ar', nombre: 'Dir A', rol: 'director' } })
  const uB = await prisma.usuario.create({ data: { email: 'b@ucc.edu.ar', nombre: 'Dir B', rol: 'director' } })
  const uS = await prisma.usuario.create({ data: { email: 's@ucc.edu.ar', nombre: 'SIED', rol: 'sied' } })
  await prisma.usuarioCarrera.create({ data: { usuarioId: uA.id, carreraId: carreraA } })
  await prisma.usuarioCarrera.create({ data: { usuarioId: uB.id, carreraId: carreraB } })

  usuarioA = { id: uA.id, nombre: 'Dir A', email: 'a@ucc.edu.ar', rol: 'director', carreraIds: [carreraA], debeElegirContrasena: false }
  usuarioB = { id: uB.id, nombre: 'Dir B', email: 'b@ucc.edu.ar', rol: 'director', carreraIds: [carreraB], debeElegirContrasena: false }
  sied = { id: uS.id, nombre: 'SIED', email: 's@ucc.edu.ar', rol: 'sied', carreraIds: [], debeElegirContrasena: false }
})

afterAll(async () => {
  await limpiar()
  await prisma.$disconnect()
})

describe('agregar', () => {
  it('crea la apertura heredando el calendario del período', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    const ap = await prisma.apertura.findFirst({ where: { asignaturaCodigo: 'TRANS1' } })
    expect(ap!.aperturaInscripcion).toEqual(new Date(2026, 7, 30))
    expect(ap!.aperturaAfi).toEqual(new Date(2026, 9, 10))
    expect(ap!.actas).toEqual(new Date(2026, 10, 12))
  })

  it('una transversal ya abierta por otra carrera no se duplica: se suma la cohorte', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    await agregar(prisma, usuarioB, carreraB, 'TRANS1', periodo1, cohorteB)

    const aperturas = await prisma.apertura.findMany({ where: { asignaturaCodigo: 'TRANS1' } })
    expect(aperturas).toHaveLength(1)
    const cohortes = await prisma.aperturaCohorte.findMany({ where: { aperturaId: aperturas[0].id } })
    expect(cohortes).toHaveLength(2)
  })

  it('avisa en el historial cuando la apertura ya existía', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    await agregar(prisma, usuarioB, carreraB, 'TRANS1', periodo1, cohorteB)
    const ultimo = await prisma.cambio.findFirst({ orderBy: { id: 'desc' } })
    expect(ultimo!.detalle).toContain('ya la había abierto otra carrera')
  })

  it('un director no puede tocar una carrera ajena', async () => {
    await expect(agregar(prisma, usuarioA, carreraB, 'TRANS1', periodo1, cohorteB))
      .rejects.toThrow('No tenés permiso')
  })

  it('el SIED puede planificar cualquier carrera', async () => {
    await agregar(prisma, sied, carreraB, 'TRANS1', periodo1, cohorteB)
    expect(await prisma.apertura.count()).toBe(1)
  })
})

describe('quitar', () => {
  it('borra la apertura si ninguna otra carrera la usaba', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    const ap = (await prisma.apertura.findFirst())!
    const r = await quitar(prisma, usuarioA, carreraA, ap.id)
    expect(r.aperturaBorrada).toBe(true)
    expect(await prisma.apertura.count()).toBe(0)
  })

  it('en una transversal compartida sólo desvincula la cohorte propia', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    await agregar(prisma, usuarioB, carreraB, 'TRANS1', periodo1, cohorteB)
    const ap = (await prisma.apertura.findFirst())!

    const r = await quitar(prisma, usuarioA, carreraA, ap.id)

    expect(r.aperturaBorrada).toBe(false)
    expect(await prisma.apertura.count()).toBe(1) // sigue abierta para B
    const quedan = await prisma.aperturaCohorte.findMany({ include: { cohorte: true } })
    expect(quedan).toHaveLength(1)
    expect(quedan[0].cohorte.carreraId).toBe(carreraB)
  })
})

describe('no se puede tocar lo ajeno pasando ids de otra carrera', () => {
  it('quitar una apertura sin cohortes de otra carrera no la borra', async () => {
    // apertura de la carrera B, sin cohortes asociadas (pasa al migrar filas sin cohorte)
    await prisma.asignatura.create({ data: { codigo: 'SOLOB', nombre: 'SÓLO DE B', estado: 'construccion' } })
    await prisma.planItem.create({ data: { carreraId: carreraB, asignaturaCodigo: 'SOLOB', orden: 1 } })
    const ap = await prisma.apertura.create({
      data: { asignaturaCodigo: 'SOLOB', periodoId: periodo1, inicioCursado: new Date(2026, 8, 9) },
    })

    // el director A usa SU carrera pero apunta a una apertura que no le corresponde
    await expect(quitar(prisma, usuarioA, carreraA, ap.id)).rejects.toThrow(/no corresponde/i)
    expect(await prisma.apertura.findUnique({ where: { id: ap.id } })).not.toBeNull()
  })

  it('mover una apertura ajena tampoco se puede', async () => {
    await prisma.asignatura.create({ data: { codigo: 'SOLOB2', nombre: 'OTRA DE B', estado: 'construccion' } })
    await prisma.planItem.create({ data: { carreraId: carreraB, asignaturaCodigo: 'SOLOB2', orden: 2 } })
    const ap = await prisma.apertura.create({
      data: { asignaturaCodigo: 'SOLOB2', periodoId: periodo1, inicioCursado: new Date(2026, 8, 9) },
    })

    await expect(mover(prisma, usuarioA, carreraA, ap.id, periodo2)).rejects.toThrow(/no corresponde/i)
    const sigue = await prisma.apertura.findUnique({ where: { id: ap.id } })
    expect(sigue!.periodoId).toBe(periodo1)
  })

  it('el SIED sí puede tocar cualquiera', async () => {
    await prisma.asignatura.create({ data: { codigo: 'SOLOB3', nombre: 'TERCERA DE B', estado: 'construccion' } })
    await prisma.planItem.create({ data: { carreraId: carreraB, asignaturaCodigo: 'SOLOB3', orden: 3 } })
    const ap = await prisma.apertura.create({
      data: { asignaturaCodigo: 'SOLOB3', periodoId: periodo1, inicioCursado: new Date(2026, 8, 9) },
    })
    await quitar(prisma, sied, carreraB, ap.id)
    expect(await prisma.apertura.findUnique({ where: { id: ap.id } })).toBeNull()
  })
})

describe('mover', () => {
  it('lleva la asignatura al otro período con las fechas del destino', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    const ap = (await prisma.apertura.findFirst())!

    await mover(prisma, usuarioA, carreraA, ap.id, periodo2)

    const aperturas = await prisma.apertura.findMany({ include: { periodo: true } })
    expect(aperturas).toHaveLength(1)
    expect(aperturas[0].periodo.nombre).toBe('Mensual_Dos')
    expect(aperturas[0].aperturaInscripcion).toEqual(new Date(2026, 8, 27))
  })

  it('mover una transversal no arrastra a la otra carrera', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    await agregar(prisma, usuarioB, carreraB, 'TRANS1', periodo1, cohorteB)
    const ap = (await prisma.apertura.findFirst())!

    await mover(prisma, usuarioA, carreraA, ap.id, periodo2)

    const aperturas = await prisma.apertura.findMany({
      include: { periodo: true, cohortes: { include: { cohorte: true } } },
      orderBy: { periodoId: 'asc' },
    })
    expect(aperturas).toHaveLength(2) // una en cada período
    const enUno = aperturas.find((x) => x.periodo.nombre === 'Mensual_Uno')!
    const enDos = aperturas.find((x) => x.periodo.nombre === 'Mensual_Dos')!
    expect(enUno.cohortes.map((c) => c.cohorte.carreraId)).toEqual([carreraB])
    expect(enDos.cohortes.map((c) => c.cohorte.carreraId)).toEqual([carreraA])
  })

  it('mover al mismo período no hace nada', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    const ap = (await prisma.apertura.findFirst())!
    expect(await mover(prisma, usuarioA, carreraA, ap.id, periodo1)).toBeNull()
    expect(await prisma.apertura.count()).toBe(1)
  })

  it('queda registrado quién movió qué', async () => {
    await agregar(prisma, usuarioA, carreraA, 'TRANS1', periodo1, cohorteA)
    const ap = (await prisma.apertura.findFirst())!
    await mover(prisma, usuarioA, carreraA, ap.id, periodo2)

    const cambio = await prisma.cambio.findFirst({
      where: { accion: 'movio_apertura' },
      include: { usuario: true },
    })
    expect(cambio!.usuario!.nombre).toBe('Dir A')
    expect(cambio!.detalle).toContain('Mensual_Uno → Mensual_Dos')
  })
})
