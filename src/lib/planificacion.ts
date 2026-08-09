import type { PrismaClient } from '@prisma/client'
import type { Sesion } from './permisos'
import { puedeEditarCarrera } from './permisos'

/**
 * Reglas de planificación de aperturas.
 *
 * La sutileza está en las transversales: una asignatura con el mismo código
 * pertenece a varias carreras y la apertura es única. Por eso, cuando una
 * carrera la quita o la mueve, sólo se llevan sus propias cohortes — la
 * apertura sobrevive mientras otra carrera la siga usando.
 */

function exigir(s: Sesion | null, carreraId: number) {
  if (!puedeEditarCarrera(s, carreraId)) {
    throw new Error('No tenés permiso para planificar esta carrera')
  }
  return s!
}

async function anotar(
  db: PrismaClient, usuarioId: number, accion: string,
  detalle: string, asignaturaCodigo: string, carreraId: number,
) {
  await db.cambio.create({ data: { usuarioId, accion, detalle, asignaturaCodigo, carreraId } })
}

/** Fechas que hereda una apertura nueva del calendario de su período. */
function fechasDe(p: {
  inicioCursado: Date; aperturaInscripcion: Date | null; cierreInscripcion: Date | null
  finCursado: Date | null; aperturaAfi: Date | null; cierreAfi: Date | null
  cierreAsignatura: Date | null; actas: Date | null
}) {
  return {
    inicioCursado: p.inicioCursado,
    aperturaInscripcion: p.aperturaInscripcion,
    cierreInscripcion: p.cierreInscripcion,
    finCursado: p.finCursado,
    aperturaAfi: p.aperturaAfi,
    cierreAfi: p.cierreAfi,
    cierreAsignatura: p.cierreAsignatura,
    actas: p.actas,
  }
}

export async function agregar(
  db: PrismaClient, s: Sesion | null, carreraId: number,
  codigo: string, periodoId: number, cohorteId: number | null,
) {
  const usuario = exigir(s, carreraId)
  const [asignatura, periodo] = await Promise.all([
    db.asignatura.findUnique({ where: { codigo } }),
    db.periodo.findUnique({ where: { id: periodoId } }),
  ])
  if (!asignatura || !periodo) throw new Error('Asignatura o período inexistente')

  const existente = await db.apertura.findUnique({
    where: { asignaturaCodigo_periodoId: { asignaturaCodigo: codigo, periodoId } },
  })
  const apertura = existente ?? await db.apertura.create({
    data: { asignaturaCodigo: codigo, periodoId, ...fechasDe(periodo) },
  })

  if (cohorteId) {
    await db.aperturaCohorte.upsert({
      where: { aperturaId_cohorteId: { aperturaId: apertura.id, cohorteId } },
      update: {},
      create: { aperturaId: apertura.id, cohorteId },
    })
  }

  await anotar(
    db, usuario.id, 'agrego_apertura',
    `${asignatura.nombre} → ${periodo.nombre}${existente ? ' (ya la había abierto otra carrera)' : ''}`,
    codigo, carreraId,
  )
  return apertura
}

export async function quitar(
  db: PrismaClient, s: Sesion | null, carreraId: number, aperturaId: number,
) {
  const usuario = exigir(s, carreraId)
  const apertura = await db.apertura.findUnique({
    where: { id: aperturaId },
    include: { asignatura: true, periodo: true, cohortes: { include: { cohorte: true } } },
  })
  if (!apertura) throw new Error('Apertura inexistente')

  const propias = apertura.cohortes.filter((c) => c.cohorte.carreraId === carreraId)
  const ajenas = apertura.cohortes.filter((c) => c.cohorte.carreraId !== carreraId)

  await db.aperturaCohorte.deleteMany({ where: { id: { in: propias.map((c) => c.id) } } })
  if (!ajenas.length) await db.apertura.delete({ where: { id: aperturaId } })

  await anotar(
    db, usuario.id, 'quito_apertura',
    `${apertura.asignatura.nombre} ← ${apertura.periodo.nombre}${ajenas.length ? ' (sigue abierta para otra carrera)' : ''}`,
    apertura.asignaturaCodigo, carreraId,
  )
  return { aperturaBorrada: !ajenas.length }
}

export async function mover(
  db: PrismaClient, s: Sesion | null, carreraId: number,
  aperturaId: number, destinoId: number,
) {
  const usuario = exigir(s, carreraId)
  const origen = await db.apertura.findUnique({
    where: { id: aperturaId },
    include: { asignatura: true, periodo: true, cohortes: { include: { cohorte: true } } },
  })
  const destino = await db.periodo.findUnique({ where: { id: destinoId } })
  if (!origen || !destino) throw new Error('Apertura o período inexistente')
  if (origen.periodoId === destinoId) return null

  const propias = origen.cohortes.filter((c) => c.cohorte.carreraId === carreraId)
  const ajenas = origen.cohortes.filter((c) => c.cohorte.carreraId !== carreraId)

  const destinoApertura = await db.apertura.upsert({
    where: { asignaturaCodigo_periodoId: { asignaturaCodigo: origen.asignaturaCodigo, periodoId: destinoId } },
    update: {},
    create: { asignaturaCodigo: origen.asignaturaCodigo, periodoId: destinoId, ...fechasDe(destino) },
  })

  for (const c of propias) {
    await db.aperturaCohorte.upsert({
      where: { aperturaId_cohorteId: { aperturaId: destinoApertura.id, cohorteId: c.cohorteId } },
      update: {},
      create: { aperturaId: destinoApertura.id, cohorteId: c.cohorteId },
    })
    await db.aperturaCohorte.delete({ where: { id: c.id } })
  }
  if (!ajenas.length) await db.apertura.delete({ where: { id: aperturaId } })

  await anotar(
    db, usuario.id, 'movio_apertura',
    `${origen.asignatura.nombre}: ${origen.periodo.nombre} → ${destino.nombre}`,
    origen.asignaturaCodigo, carreraId,
  )
  return destinoApertura
}
