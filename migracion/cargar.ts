import type { PrismaClient } from '@prisma/client'
import { mapEstado } from '../src/lib/normalizar'
import { inferirPeriodo } from '../src/lib/inferir-periodo'
import { validarFechas } from '../src/lib/validar'
import { ESTADOS, type Estado } from '../src/lib/estados'
import type { FilaAsignatura } from './parsers/tipos'
import type { FilaTablero } from './parsers/tablero'
import type { PeriodoCalendario } from './parsers/periodos'
import type { FilaPlanEstudios } from './parsers/planes'

export type Reporte = {
  asignaturas: number
  aperturas: number
  sinCodigo: string[]
  sinPeriodo: string[]
  nombresEnConflicto: string[]
  fechasIncoherentes: string[]
}

function ordenEstado(e: Estado): number {
  return ESTADOS.indexOf(e)
}

/** Duración declarada en la planilla; si falta, se asume bimestral (lo más común). */
function tipoDePeriodo(f: FilaAsignatura): string {
  return (f.duracion ?? '').toLowerCase().includes('cuatrim') ? 'cuatrimestral' : 'bimestral'
}

export async function cargar(
  filas: FilaAsignatura[],
  tablero: FilaTablero[],
  db: PrismaClient,
  calendarioEducacion: PeriodoCalendario[] = [],
  planesEstudio: FilaPlanEstudios[] = [],
): Promise<Reporte> {
  const reporte: Reporte = {
    asignaturas: 0, aperturas: 0, sinCodigo: [], sinPeriodo: [], nombresEnConflicto: [], fechasIncoherentes: [],
  }

  // Las planillas traen errores de carga, sobre todo en los períodos más nuevos:
  // se cargan igual, pero quedan listados para revisar.
  for (const f of filas) {
    const problemas = validarFechas(f.fechas)
    if (problemas.length) {
      reporte.fechasIncoherentes.push(`${f.nombre} (${f.carrera}${f.cohorte ? `, ${f.cohorte}` : ''}): ${problemas.join('; ')}`)
    }
  }

  // 1. Unidades y carreras
  await db.unidad.upsert({ where: { id: 'posgrado' }, update: {}, create: { id: 'posgrado', nombre: 'Posgrado' } })
  await db.unidad.upsert({ where: { id: 'educacion' }, update: {}, create: { id: 'educacion', nombre: 'Educación' } })

  // Los planes de estudio son el catálogo completo de cada carrera: entran como
  // filas sin período, así el planificador muestra todo el plan aunque una
  // asignatura todavía no se haya abierto nunca.
  const desdePlanes: FilaAsignatura[] = planesEstudio.map((p) => ({
    unidad: p.unidad, carrera: p.carrera, cohorte: null,
    codigo: p.codigo, nombre: p.nombre, catedra: null, cargaHoraria: null,
    orden: p.orden, duracion: null, estadoOrigen: '', periodoNombre: null,
    fechas: {
      inicioCursado: null, aperturaInscripcion: null, cierreInscripcion: null,
      finCursado: null, aperturaAfi: null, cierreAfi: null, cierreAsignatura: null, actas: null,
    },
  }))
  // El plan va primero: define el orden. Las filas con período pisan lo demás.
  const todas = [...desdePlanes, ...filas]

  const conCodigo = todas.filter((f) => {
    if (f.codigo) return true
    reporte.sinCodigo.push(`${f.nombre} (${f.carrera})`)
    return false
  })

  const carreraIds = new Map<string, number>() // "unidad|nombre" -> id
  for (const f of conCodigo) {
    const clave = `${f.unidad}|${f.carrera}`
    if (carreraIds.has(clave)) continue
    const c = await db.carrera.upsert({
      where: { unidadId_nombre: { unidadId: f.unidad, nombre: f.carrera } },
      update: {},
      create: { unidadId: f.unidad, nombre: f.carrera },
    })
    carreraIds.set(clave, c.id)
  }

  // 2. Asignaturas por código (nombre más largo gana; estado más avanzado gana)
  const porCodigo = new Map<string, FilaAsignatura[]>()
  for (const f of conCodigo) porCodigo.set(f.codigo!, [...(porCodigo.get(f.codigo!) ?? []), f])

  for (const [codigo, grupo] of porCodigo) {
    const nombres = [...new Set(grupo.map((g) => g.nombre))]
    if (nombres.length > 1) reporte.nombresEnConflicto.push(`${codigo}: ${nombres.join(' / ')}`)
    const nombre = [...nombres].sort((a, b) => b.length - a.length)[0]
    const estado = grupo.map((g) => mapEstado(g.estadoOrigen)).sort((a, b) => ordenEstado(b) - ordenEstado(a))[0]
    const catedra = grupo.find((g) => g.catedra)?.catedra ?? null
    const cargaHoraria = grupo.find((g) => g.cargaHoraria)?.cargaHoraria ?? null
    await db.asignatura.upsert({
      where: { codigo },
      update: { nombre, estado },
      create: { codigo, nombre, estado, catedra, cargaHoraria },
    })
    reporte.asignaturas++
  }

  // 3. PlanItems y cohortes
  const cohorteIds = new Map<string, number>() // "carreraId|nombre" -> id
  for (const f of conCodigo) {
    const carreraId = carreraIds.get(`${f.unidad}|${f.carrera}`)!
    await db.planItem.upsert({
      where: { carreraId_asignaturaCodigo: { carreraId, asignaturaCodigo: f.codigo! } },
      update: f.orden != null ? { orden: f.orden } : {},
      create: { carreraId, asignaturaCodigo: f.codigo!, orden: f.orden },
    })
    if (f.cohorte) {
      const claveCo = `${carreraId}|${f.cohorte}`
      if (!cohorteIds.has(claveCo)) {
        const co = await db.cohorte.upsert({
          where: { carreraId_nombre: { carreraId, nombre: f.cohorte } },
          update: {},
          create: { carreraId, nombre: f.cohorte },
        })
        cohorteIds.set(claveCo, co.id)
      }
    }
  }

  // 4a. Períodos de posgrado (por nombre)
  for (const f of conCodigo.filter((x) => x.unidad === 'posgrado' && x.periodoNombre)) {
    const existente = await db.periodo.findUnique({
      where: { unidadId_nombre: { unidadId: 'posgrado', nombre: f.periodoNombre! } },
    })
    if (!existente) {
      if (!f.fechas.inicioCursado) continue // sin fecha no se puede crear el período todavía
      await db.periodo.create({
        data: {
          unidadId: 'posgrado', nombre: f.periodoNombre!, tipo: 'mensual',
          inicioCursado: f.fechas.inicioCursado,
          aperturaInscripcion: f.fechas.aperturaInscripcion,
          cierreInscripcion: f.fechas.cierreInscripcion,
        },
      })
    } else if (f.fechas.inicioCursado && f.fechas.inicioCursado < existente.inicioCursado) {
      await db.periodo.update({ where: { id: existente.id }, data: { inicioCursado: f.fechas.inicioCursado } })
    }
  }

  // 4b-i. Calendario oficial de Educación (hoja de períodos: Bimestre A, Cuatrimestral A, ...).
  // Es la fuente de verdad: trae el ciclo completo de cada período.
  for (const p of calendarioEducacion) {
    await db.periodo.upsert({
      where: { unidadId_nombre: { unidadId: 'educacion', nombre: p.nombre } },
      update: {
        tipo: p.tipo, mes: p.mes, inicioCursado: p.inicioCursado,
        aperturaInscripcion: p.aperturaInscripcion, cierreInscripcion: p.cierreInscripcion,
        finCursado: p.finCursado, aperturaAfi: p.aperturaAfi, cierreAfi: p.cierreAfi,
        cierreAsignatura: p.cierreAsignatura, actas: p.actas,
      },
      create: {
        unidadId: 'educacion', nombre: p.nombre, tipo: p.tipo, mes: p.mes,
        inicioCursado: p.inicioCursado,
        aperturaInscripcion: p.aperturaInscripcion, cierreInscripcion: p.cierreInscripcion,
        finCursado: p.finCursado, aperturaAfi: p.aperturaAfi, cierreAfi: p.cierreAfi,
        cierreAsignatura: p.cierreAsignatura, actas: p.actas,
      },
    })
  }

  // 4b-ii. Para lo que no cubra el calendario, se generan períodos desde las fechas,
  // agrupando por fecha de inicio Y duración.
  const filasEdu = conCodigo.filter((x) => x.unidad === 'educacion' && x.fechas.inicioCursado)
  const porTipo = new Map<string, FilaAsignatura[]>()
  for (const f of filasEdu) {
    const t = tipoDePeriodo(f)
    porTipo.set(t, [...(porTipo.get(t) ?? []), f])
  }
  for (const [tipo, filasTipo] of porTipo) {
    const fechas = [...new Set(filasTipo.map((x) => x.fechas.inicioCursado!.getTime()))]
      .sort((a, b) => a - b)
      .map((t) => new Date(t))
    for (const fecha of fechas) {
      const existentes = (await db.periodo.findMany({ where: { unidadId: 'educacion', tipo } }))
        .map((p) => ({ id: p.id, inicioCursado: p.inicioCursado }))
      if (inferirPeriodo(fecha, existentes) !== null) continue
      const ref = filasTipo.find((x) => Math.abs(x.fechas.inicioCursado!.getTime() - fecha.getTime()) / 86_400_000 <= 10)
      const etiqueta = tipo === 'bimestral' ? 'Bimestre' : 'Cuatrimestre'
      await db.periodo.create({
        data: {
          unidadId: 'educacion',
          nombre: `${etiqueta} ${fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
          tipo,
          inicioCursado: fecha,
          aperturaInscripcion: ref?.fechas.aperturaInscripcion ?? null,
          cierreInscripcion: ref?.fechas.cierreInscripcion ?? null,
        },
      })
    }
  }

  // 5. Aperturas (única por código+período) y sus cohortes
  const periodosPos = (await db.periodo.findMany({ where: { unidadId: 'posgrado' } }))
  const periodosEdu = await db.periodo.findMany({ where: { unidadId: 'educacion' } })

  for (const f of conCodigo) {
    let periodoId: number | null = null
    if (f.unidad === 'posgrado') {
      periodoId = f.periodoNombre
        ? periodosPos.find((p) => p.nombre === f.periodoNombre)?.id ?? null
        : null
      if (!periodoId && f.fechas.inicioCursado) {
        periodoId = inferirPeriodo(f.fechas.inicioCursado, periodosPos.map((p) => ({ id: p.id, inicioCursado: p.inicioCursado })))
      }
    } else {
      // sólo se compara contra los períodos de la misma duración que la asignatura
      const candidatos = periodosEdu
        .filter((p) => p.tipo === tipoDePeriodo(f))
        .map((p) => ({ id: p.id, inicioCursado: p.inicioCursado }))
      periodoId = f.fechas.inicioCursado ? inferirPeriodo(f.fechas.inicioCursado, candidatos) : null
    }
    if (!periodoId) {
      if (f.periodoNombre || f.fechas.inicioCursado || f.unidad === 'educacion') {
        reporte.sinPeriodo.push(`${f.nombre} (${f.carrera})`)
      }
      continue
    }
    const apertura = await db.apertura.upsert({
      where: { asignaturaCodigo_periodoId: { asignaturaCodigo: f.codigo!, periodoId } },
      update: {
        inicioCursado: f.fechas.inicioCursado, aperturaInscripcion: f.fechas.aperturaInscripcion,
        cierreInscripcion: f.fechas.cierreInscripcion, finCursado: f.fechas.finCursado,
        aperturaAfi: f.fechas.aperturaAfi, cierreAfi: f.fechas.cierreAfi,
        cierreAsignatura: f.fechas.cierreAsignatura, actas: f.fechas.actas,
      },
      create: {
        asignaturaCodigo: f.codigo!, periodoId,
        inicioCursado: f.fechas.inicioCursado, aperturaInscripcion: f.fechas.aperturaInscripcion,
        cierreInscripcion: f.fechas.cierreInscripcion, finCursado: f.fechas.finCursado,
        aperturaAfi: f.fechas.aperturaAfi, cierreAfi: f.fechas.cierreAfi,
        cierreAsignatura: f.fechas.cierreAsignatura, actas: f.fechas.actas,
      },
    })
    if (f.cohorte) {
      const carreraId = carreraIds.get(`${f.unidad}|${f.carrera}`)!
      const cohorteId = cohorteIds.get(`${carreraId}|${f.cohorte}`)
      if (cohorteId) {
        await db.aperturaCohorte.upsert({
          where: { aperturaId_cohorteId: { aperturaId: apertura.id, cohorteId } },
          update: {},
          create: { aperturaId: apertura.id, cohorteId },
        })
      }
    }
  }
  reporte.aperturas = await db.apertura.count()

  // 6. Datos del tablero: docente/asesor siempre; estado solo si el actual es sin_novedad
  for (const t of tablero) {
    const a = await db.asignatura.findUnique({ where: { codigo: t.codigo } })
    if (!a) continue
    await db.asignatura.update({
      where: { codigo: t.codigo },
      data: {
        docente: t.docente ?? a.docente,
        asesor: t.asesor ?? a.asesor,
        estado: a.estado === 'sin_novedad' ? t.estado : a.estado,
      },
    })
  }

  return reporte
}
