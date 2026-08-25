'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { agregar, quitar, mover, exigirPertenencia } from '@/lib/planificacion'
import { puedeEditarCarrera, puedeValidarDocentes } from '@/lib/permisos'
import { parseDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'
import { comoResultado } from '@/lib/accion'
import type { EstadoAccion } from '@/lib/estado-accion'

export async function agregarApertura(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    const codigo = String(formData.get('codigo') ?? '')
    const periodoId = Number(formData.get('periodoId'))
    const cohorteId = formData.get('cohorteId') ? Number(formData.get('cohorteId')) : null
    if (!codigo || !periodoId) throw new Error('Elegí el período antes de agregar')
    await agregar(prisma, s, carreraId, codigo, periodoId, cohorteId)
    revalidatePath('/', 'layout')
  })
}

export async function quitarApertura(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    await quitar(prisma, s, carreraId, Number(formData.get('aperturaId')))
    revalidatePath('/', 'layout')
  })
}

export async function moverApertura(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    const destinoId = Number(formData.get('destinoId'))
    if (!destinoId) throw new Error('Elegí el período de destino')
    await mover(prisma, s, carreraId, Number(formData.get('aperturaId')), destinoId)
    revalidatePath('/', 'layout')
  })
}

/**
 * El docente tutor es de esta apertura puntual, no de la carrera — si es
 * transversal, cualquier carrera que la comparta puede cargarlo o corregirlo,
 * y el cambio se ve igual para todas (es el mismo dato).
 */
export async function editarDocentesTutorApertura(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
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
        docentesTutor: true,
      },
    })
    if (!apertura) throw new Error('Apertura inexistente')
    exigirPertenencia(s, carreraId, apertura)

    const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

    // Si el grupo cambió, lo que se había validado ya no aplica: era sobre
    // esas personas puntuales.
    const anteriores = apertura.docentesTutor.map((d) => d.nombre)
    if (!mismoGrupoDeDocentes(anteriores, docentes)) {
      await prisma.apertura.update({ where: { id: aperturaId }, data: { docenteTutorValidado: false } })
    }

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
  })
}

/** El director cerró el aviso de "podés sumarte" sin sumar su cohorte. */
export async function descartarAviso(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
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
  })
}

/** Una cohorte nueva empieza sin nada planificado: es una fila vacía en la grilla. */
export async function crearCohorte(
  carreraId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
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
  })
}

/**
 * Prende o apaga la validación del grupo de docentes tutores de esta
 * apertura. Exclusivo de Unidad Académica y Administración: ni siquiera el
 * equipo SIED, que suele cargar estos mismos datos, puede tocarla.
 */
export async function alternarValidacionDocenteTutor(
  aperturaId: number,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeValidarDocentes(s)) {
      throw new Error('Sólo Unidad Académica o Administración pueden validar')
    }

    const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: { asignatura: true },
    })
    if (!apertura) throw new Error('Apertura inexistente')

    const nuevoValor = !apertura.docenteTutorValidado
    await prisma.apertura.update({ where: { id: aperturaId }, data: { docenteTutorValidado: nuevoValor } })
    await prisma.cambio.create({
      data: {
        usuarioId: s.id,
        accion: 'valido_docente_tutor',
        detalle: `${apertura.asignatura.nombre}: docente tutor ${nuevoValor ? 'validado' : 'desvalidado'}`,
        asignaturaCodigo: apertura.asignaturaCodigo,
      },
    })
    revalidatePath('/', 'layout')
  })
}
