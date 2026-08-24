'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { parseDocentes } from '@/lib/docentes'
import { comoResultado } from '@/lib/accion'
import type { EstadoAccion } from '@/lib/estado-accion'

export async function actualizarAsignatura(
  codigo: string,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
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
          usuarioId: s.id,
          accion: 'cambio_estado',
          detalle: `${previa.nombre}: ${ESTADO_LABELS[previa.estado as Estado]} → ${ESTADO_LABELS[estado as Estado]}`,
          asignaturaCodigo: codigo,
        },
      })
    }
    revalidatePath('/', 'layout')
  })
}

/**
 * Suma un seminario optativo que ayuda a cubrir este lugar del plan. Lo crea:
 * estos códigos no vienen de las planillas, porque no son parte del plan de
 * estudios — se arman a medida cuando se decide desdoblar el seminario.
 */
export async function crearVariante(
  principalCodigo: string,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeEditarProduccion(s)) {
      throw new Error('Sólo el equipo SIED arma los seminarios optativos')
    }

    const principal = await prisma.asignatura.findUnique({ where: { codigo: principalCodigo } })
    if (!principal) throw new Error('Asignatura inexistente')
    if (principal.principalCodigo) {
      throw new Error(
        `${principal.nombre} ya es un seminario optativo de otro. No se pueden encadenar.`,
      )
    }

    const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase()
    const nombre = String(formData.get('nombre') ?? '').trim()
    if (!codigo) throw new Error('Poné el código del seminario')
    if (!nombre) throw new Error('Poné el nombre del seminario')
    if (codigo === principalCodigo) throw new Error('Una asignatura no puede depender de sí misma')

    const existente = await prisma.asignatura.findUnique({ where: { codigo } })
    if (existente) throw new Error(`Ya existe una asignatura con el código ${codigo}: ${existente.nombre}`)

    await prisma.asignatura.create({ data: { codigo, nombre, principalCodigo } })
    await prisma.cambio.create({
      data: {
        usuarioId: s.id,
        accion: 'cambio_estado',
        detalle: `${principal.nombre}: se sumó el seminario ${nombre} (${codigo})`,
        asignaturaCodigo: principalCodigo,
      },
    })
    revalidatePath('/', 'layout')
  })
}

/**
 * Cuántos de esos seminarios hacen falta para dar por cubierto el lugar del
 * plan. Depende de la carga horaria de cada uno, así que se define a mano.
 */
export async function definirVariantesRequeridas(
  codigo: string,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeEditarProduccion(s)) {
      throw new Error('Sólo el equipo SIED arma los seminarios optativos')
    }

    const requeridas = Number(formData.get('variantesRequeridas'))
    if (!Number.isInteger(requeridas) || requeridas < 1) {
      throw new Error('Tiene que ser un número entero de 1 o más')
    }

    const a = await prisma.asignatura.findUnique({
      where: { codigo },
      include: { _count: { select: { variantes: true } } },
    })
    if (!a) throw new Error('Asignatura inexistente')
    if (requeridas > a._count.variantes) {
      throw new Error(
        `Sólo hay ${a._count.variantes} seminario(s) cargado(s): no se pueden exigir ${requeridas}.`,
      )
    }

    await prisma.asignatura.update({ where: { codigo }, data: { variantesRequeridas: requeridas } })
    revalidatePath('/', 'layout')
  })
}

/** Desvincula un seminario optativo sin borrarlo: la producción cargada se conserva. */
export async function desvincularVariante(
  codigo: string,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeEditarProduccion(s)) {
      throw new Error('Sólo el equipo SIED arma los seminarios optativos')
    }

    const v = await prisma.asignatura.findUnique({ where: { codigo } })
    if (!v?.principalCodigo) throw new Error('Ese seminario no está vinculado a ninguno')

    // Si exigía más de los que quedan, el número deja de tener sentido.
    const quedan = await prisma.asignatura.count({
      where: { principalCodigo: v.principalCodigo, codigo: { not: codigo } },
    })
    await prisma.asignatura.update({ where: { codigo }, data: { principalCodigo: null } })
    await prisma.asignatura.updateMany({
      where: { codigo: v.principalCodigo, variantesRequeridas: { gt: Math.max(quedan, 1) } },
      data: { variantesRequeridas: Math.max(quedan, 1) },
    })
    revalidatePath('/', 'layout')
  })
}
