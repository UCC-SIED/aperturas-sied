'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { parseDocentes } from '@/lib/docentes'

export async function actualizarAsignatura(codigo: string, formData: FormData) {
  const s = await sesionActual()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED edita el estado de producción')
  }

  const estado = String(formData.get('estado') ?? '')
  if (!(ESTADOS as readonly string[]).includes(estado)) throw new Error('Estado inválido')

  const previa = await prisma.asignatura.findUnique({ where: { codigo } })
  if (!previa) throw new Error('Asignatura inexistente')

  const docentes = parseDocentes(String(formData.get('docente') ?? ''))
  const asesor = String(formData.get('asesor') ?? '').trim() || null

  await prisma.asignatura.update({
    where: { codigo },
    data: { estado, asesor },
  })
  await prisma.asignaturaDocente.deleteMany({ where: { asignaturaCodigo: codigo } })
  if (docentes.length) {
    await prisma.asignaturaDocente.createMany({
      data: docentes.map((nombre, orden) => ({ asignaturaCodigo: codigo, nombre, orden })),
    })
  }

  if (previa.estado !== estado) {
    await prisma.cambio.create({
      data: {
        usuarioId: s!.id,
        accion: 'cambio_estado',
        detalle: `${previa.nombre}: ${ESTADO_LABELS[previa.estado as Estado]} → ${ESTADO_LABELS[estado as Estado]}`,
        asignaturaCodigo: codigo,
      },
    })
  }
  revalidatePath('/', 'layout')
}
