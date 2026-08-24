'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { agregar, quitar, mover, exigirPertenencia } from '@/lib/planificacion'
import { puedeEditarCarrera } from '@/lib/permisos'
import { parseDocentes } from '@/lib/docentes'

export async function agregarApertura(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  const codigo = String(formData.get('codigo') ?? '')
  const periodoId = Number(formData.get('periodoId'))
  const cohorteId = formData.get('cohorteId') ? Number(formData.get('cohorteId')) : null
  if (!codigo || !periodoId) throw new Error('Elegí el período antes de agregar')
  await agregar(prisma, s, carreraId, codigo, periodoId, cohorteId)
  revalidatePath('/', 'layout')
}

export async function quitarApertura(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  await quitar(prisma, s, carreraId, Number(formData.get('aperturaId')))
  revalidatePath('/', 'layout')
}

export async function moverApertura(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  const destinoId = Number(formData.get('destinoId'))
  if (!destinoId) throw new Error('Elegí el período de destino')
  await mover(prisma, s, carreraId, Number(formData.get('aperturaId')), destinoId)
  revalidatePath('/', 'layout')
}

/**
 * El docente tutor es de esta apertura puntual, no de la carrera — si es
 * transversal, cualquier carrera que la comparta puede cargarlo o corregirlo,
 * y el cambio se ve igual para todas (es el mismo dato).
 */
export async function editarDocentesTutorApertura(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarCarrera(s, carreraId)) {
    throw new Error('No tenés permiso para planificar esta carrera')
  }
  const aperturaId = Number(formData.get('aperturaId'))
  const apertura = await prisma.apertura.findUnique({
    where: { id: aperturaId },
    include: {
      asignatura: { include: { planItems: true } },
      cohortes: { include: { cohorte: true } },
    },
  })
  if (!apertura) throw new Error('Apertura inexistente')
  exigirPertenencia(s, carreraId, apertura)

  const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

  await prisma.aperturaDocente.deleteMany({ where: { aperturaId } })
  if (docentes.length) {
    await prisma.aperturaDocente.createMany({
      data: docentes.map((nombre, orden) => ({ aperturaId, nombre, orden })),
    })
  }
  await prisma.cambio.create({
    data: {
      usuarioId: s.id,
      accion: 'edito_docente_tutor',
      detalle: `Docente tutor de ${apertura.asignatura.nombre} en esta apertura`,
      asignaturaCodigo: apertura.asignaturaCodigo,
      carreraId,
    },
  })
  revalidatePath('/', 'layout')
}

/** El director cerró el aviso de "podés sumarte" sin sumar su cohorte. */
export async function descartarAviso(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarCarrera(s, carreraId)) {
    throw new Error('No tenés permiso para planificar esta carrera')
  }
  const aperturaId = Number(formData.get('aperturaId'))
  if (!aperturaId) throw new Error('Apertura inexistente')

  await prisma.avisoDescartado.upsert({
    where: { carreraId_aperturaId: { carreraId, aperturaId } },
    update: {},
    create: { carreraId, aperturaId },
  })
  revalidatePath('/', 'layout')
}

/** Una cohorte nueva empieza sin nada planificado: es una fila vacía en la grilla. */
export async function crearCohorte(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarCarrera(s, carreraId)) {
    throw new Error('No tenés permiso para planificar esta carrera')
  }
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!nombre) throw new Error('Poné un nombre de cohorte')

  const existente = await prisma.cohorte.findUnique({
    where: { carreraId_nombre: { carreraId, nombre } },
  })
  if (existente) throw new Error(`Ya existe una cohorte "${nombre}" en esta carrera`)

  await prisma.cohorte.create({ data: { carreraId, nombre } })
  await prisma.cambio.create({
    data: { usuarioId: s.id, accion: 'creo_cohorte', detalle: `Nueva cohorte: ${nombre}`, carreraId },
  })
  revalidatePath('/', 'layout')
}
