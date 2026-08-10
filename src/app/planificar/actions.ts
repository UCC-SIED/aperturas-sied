'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { agregar, quitar, mover } from '@/lib/planificacion'
import { puedeEditarCarrera } from '@/lib/permisos'

export async function agregarApertura(carreraId: number, formData: FormData) {
  const s = await sesionActual()
  const codigo = String(formData.get('codigo') ?? '')
  const periodoId = Number(formData.get('periodoId'))
  const cohorteId = formData.get('cohorteId') ? Number(formData.get('cohorteId')) : null
  if (!codigo || !periodoId) throw new Error('Elegí el período antes de agregar')
  await agregar(prisma, s, carreraId, codigo, periodoId, cohorteId)
  revalidatePath('/', 'layout')
}

export async function quitarApertura(carreraId: number, formData: FormData) {
  const s = await sesionActual()
  await quitar(prisma, s, carreraId, Number(formData.get('aperturaId')))
  revalidatePath('/', 'layout')
}

export async function moverApertura(carreraId: number, formData: FormData) {
  const s = await sesionActual()
  const destinoId = Number(formData.get('destinoId'))
  if (!destinoId) throw new Error('Elegí el período de destino')
  await mover(prisma, s, carreraId, Number(formData.get('aperturaId')), destinoId)
  revalidatePath('/', 'layout')
}

/** Una cohorte nueva empieza sin nada planificado: es una fila vacía en la grilla. */
export async function crearCohorte(carreraId: number, formData: FormData) {
  const s = await sesionActual()
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
    data: { usuarioId: s!.id, accion: 'creo_cohorte', detalle: `Nueva cohorte: ${nombre}`, carreraId },
  })
  revalidatePath('/', 'layout')
}
