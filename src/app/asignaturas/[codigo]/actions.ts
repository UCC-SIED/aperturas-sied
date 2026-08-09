'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { ESTADOS } from '@/lib/estados'

export async function actualizarAsignatura(codigo: string, formData: FormData) {
  const estado = String(formData.get('estado') ?? '')
  if (!(ESTADOS as readonly string[]).includes(estado)) throw new Error('Estado inválido')
  await prisma.asignatura.update({
    where: { codigo },
    data: {
      estado,
      docente: String(formData.get('docente') ?? '').trim() || null,
      asesor: String(formData.get('asesor') ?? '').trim() || null,
    },
  })
  revalidatePath('/', 'layout')
}
