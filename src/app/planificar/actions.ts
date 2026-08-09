'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { agregar, quitar, mover } from '@/lib/planificacion'

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
