'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { calcularCambios } from '@/lib/seguimiento'

/**
 * Guarda de una vez lo que se editó en la tabla de seguimiento de una carrera.
 * Sólo escribe las filas que realmente cambiaron.
 */
export async function guardarSeguimiento(carreraId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED edita el estado de producción')
  }

  const items = await prisma.planItem.findMany({
    where: { carreraId },
    include: {
      asignatura: {
        include: {
          docentes: { orderBy: { orden: 'asc' } },
          // Los seminarios optativos se editan en la misma tabla pero no
          // tienen PlanItem propio: sin esto, sus filas no se guardarían.
          variantes: { include: { docentes: { orderBy: { orden: 'asc' } } } },
        },
      },
    },
  })

  const asignaturas = items.flatMap((i) => [i.asignatura, ...i.asignatura.variantes])

  const cambios = calcularCambios(
    asignaturas.map((a) => ({
      codigo: a.codigo,
      estado: a.estado,
      docentes: a.docentes.map((d) => d.nombre),
      asesor: a.asesor,
      observaciones: a.observaciones,
    })),
    formData,
  )

  const ahora = new Date()
  for (const c of cambios) {
    const { docentes, ...camposEscalares } = c.campos
    if (Object.keys(camposEscalares).length) {
      await prisma.asignatura.update({
        where: { codigo: c.codigo },
        data: {
          ...camposEscalares,
          ...(camposEscalares.estado ? { estadoDesde: ahora } : {}),
        },
      })
    }
    if (docentes !== undefined) {
      await prisma.asignaturaDocente.deleteMany({ where: { asignaturaCodigo: c.codigo } })
      if (docentes.length) {
        await prisma.asignaturaDocente.createMany({
          data: docentes.map((nombre, orden) => ({ asignaturaCodigo: c.codigo, nombre, orden })),
        })
      }
    }
    const nombre = asignaturas.find((a) => a.codigo === c.codigo)?.nombre ?? c.codigo
    await prisma.cambio.create({
      data: {
        usuarioId: s.id,
        accion: 'cambio_estado',
        detalle: `${nombre}: ${c.detalle}`,
        asignaturaCodigo: c.codigo,
        carreraId,
      },
    })
  }

  revalidatePath('/', 'layout')
}
