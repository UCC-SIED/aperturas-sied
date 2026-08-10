'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { calcularCambios } from '@/lib/seguimiento'

/**
 * Guarda de una vez lo que se editó en la tabla de seguimiento de una carrera.
 * Sólo escribe las filas que realmente cambiaron.
 */
export async function guardarSeguimiento(carreraId: number, formData: FormData) {
  const s = await sesionActual()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED edita el estado de producción')
  }

  const items = await prisma.planItem.findMany({
    where: { carreraId },
    include: { asignatura: true },
  })

  const cambios = calcularCambios(
    items.map((i) => ({
      codigo: i.asignatura.codigo,
      estado: i.asignatura.estado,
      catedra: i.asignatura.catedra,
      docente: i.asignatura.docente,
      asesor: i.asignatura.asesor,
      observaciones: i.asignatura.observaciones,
    })),
    formData,
  )

  const ahora = new Date()
  for (const c of cambios) {
    await prisma.asignatura.update({
      where: { codigo: c.codigo },
      data: {
        ...c.campos,
        ...(c.campos.estado ? { estadoDesde: ahora } : {}),
      },
    })
    const nombre = items.find((i) => i.asignatura.codigo === c.codigo)?.asignatura.nombre ?? c.codigo
    await prisma.cambio.create({
      data: {
        usuarioId: s!.id,
        accion: 'cambio_estado',
        detalle: `${nombre}: ${c.detalle}`,
        asignaturaCodigo: c.codigo,
        carreraId,
      },
    })
  }

  revalidatePath('/', 'layout')
}
