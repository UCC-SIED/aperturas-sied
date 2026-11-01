'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { calcularCambios } from '@/lib/seguimiento'
import { resolverDocentes } from '@/lib/docentes'
import { resolverAsesor } from '@/lib/asesores'
import { comoResultado } from '@/lib/accion'
import type { EstadoAccion } from '@/lib/estado-accion'

/**
 * Guarda de una vez lo que se editó en la tabla de seguimiento de una carrera.
 * Sólo escribe las filas que realmente cambiaron.
 */
export async function guardarSeguimiento(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
  const s = await exigirSesionActiva()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED edita el estado de producción')
  }

  const items = await prisma.planItem.findMany({
    where: { carreraId },
    include: {
      asignatura: {
        include: {
          docentes: { orderBy: { orden: 'asc' }, include: { docente: true } },
          asesor: true,
          // Los seminarios optativos se editan en la misma tabla pero no
          // tienen PlanItem propio: sin esto, sus filas no se guardarían.
          variantes: { include: { docentes: { orderBy: { orden: 'asc' }, include: { docente: true } }, asesor: true } },
        },
      },
    },
  })

  const asignaturas = items.flatMap((i) => [i.asignatura, ...i.asignatura.variantes])

  const cambios = calcularCambios(
    asignaturas.map((a) => ({
      codigo: a.codigo,
      estado: a.estado,
      docentes: a.docentes.map((d) => d.docente.nombre),
      asesor: a.asesor?.nombre ?? null,
      observaciones: a.observaciones,
    })),
    formData,
  )

  const ahora = new Date()
  for (const c of cambios) {
    const { docentes, asesor, ...camposEscalares } = c.campos
    const asesorId = asesor !== undefined ? await resolverAsesor(prisma, asesor) : undefined
    if (Object.keys(camposEscalares).length || asesorId !== undefined) {
      await prisma.asignatura.update({
        where: { codigo: c.codigo },
        data: {
          ...camposEscalares,
          ...(asesorId !== undefined ? { asesorId } : {}),
          ...(camposEscalares.estado ? { estadoDesde: ahora } : {}),
        },
      })
    }
    if (docentes !== undefined) {
      await prisma.asignaturaDocente.deleteMany({ where: { asignaturaCodigo: c.codigo } })
      if (docentes.length) {
        const ids = await resolverDocentes(prisma, docentes)
        await prisma.asignaturaDocente.createMany({
          data: ids.map((docenteId, orden) => ({ asignaturaCodigo: c.codigo, docenteId, orden })),
        })
      }
      await prisma.asignatura.update({
        where: { codigo: c.codigo },
        data: { contenidistasValidados: false },
      })
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
  })
}
