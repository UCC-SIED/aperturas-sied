'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeAdministrar } from '@/lib/permisos'
import { normalizarNombre } from '@/lib/docentes'
import { comoResultado } from '@/lib/accion'
import type { EstadoAccion } from '@/lib/estado-accion'

async function exigirAdmin() {
  const s = await exigirSesionActiva()
  if (!puedeAdministrar(s)) throw new Error('Sólo administración gestiona el catálogo de docentes')
  return s
}

async function anotar(usuarioId: number, detalle: string) {
  await prisma.cambio.create({ data: { usuarioId, accion: 'gestion_docentes', detalle } })
}

export async function crearDocente(
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const nombre = String(formData.get('nombre') ?? '').trim()
    if (!nombre) throw new Error('Poné el nombre de la persona')

    const claveNormalizada = normalizarNombre(nombre)
    const existente = await prisma.docente.findUnique({ where: { claveNormalizada } })
    if (existente) throw new Error(`Ya existe un docente con ese nombre: ${existente.nombre}`)

    await prisma.docente.create({ data: { nombre, claveNormalizada } })
    await anotar(admin.id, `Alta de docente: ${nombre}`)
    revalidatePath('/docentes')
  })
}

export async function renombrarDocente(
  docenteId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const nombre = String(formData.get('nombre') ?? '').trim()
    if (!nombre) throw new Error('Poné el nombre de la persona')

    const d = await prisma.docente.findUnique({ where: { id: docenteId } })
    if (!d) throw new Error('Docente inexistente')

    const claveNormalizada = normalizarNombre(nombre)
    const otro = await prisma.docente.findUnique({ where: { claveNormalizada } })
    if (otro && otro.id !== docenteId) {
      throw new Error(`Ya existe un docente con ese nombre: ${otro.nombre}. Fusionalos en vez de renombrar.`)
    }

    await prisma.docente.update({ where: { id: docenteId }, data: { nombre, claveNormalizada } })
    await anotar(admin.id, `${d.nombre} → ${nombre}`)
    revalidatePath('/docentes')
    revalidatePath('/', 'layout')
  })
}

export async function alternarActivoDocente(
  docenteId: number,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const d = await prisma.docente.findUnique({ where: { id: docenteId } })
    if (!d) throw new Error('Docente inexistente')

    await prisma.docente.update({ where: { id: docenteId }, data: { activo: !d.activo } })
    await anotar(admin.id, `${d.nombre}: ${d.activo ? 'baja' : 'alta'} del catálogo`)
    revalidatePath('/docentes')
  })
}

/**
 * Junta dos entradas que en realidad son la misma persona (cargada distinto
 * antes de que existiera este catálogo): todo lo que tenía asignado el
 * docente de origen pasa al destino, y el de origen se borra.
 */
export async function fusionarDocentes(
  origenId: number,
  _prevState: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const admin = await exigirAdmin()
    const destinoId = Number(formData.get('destinoId'))
    if (!destinoId) throw new Error('Elegí con quién fusionar')
    if (destinoId === origenId) throw new Error('Elegí una persona distinta')

    const [origen, destino] = await Promise.all([
      prisma.docente.findUnique({ where: { id: origenId } }),
      prisma.docente.findUnique({ where: { id: destinoId } }),
    ])
    if (!origen) throw new Error('Docente de origen inexistente')
    if (!destino) throw new Error('Docente de destino inexistente')

    // Donde el destino ya está asignado a la misma apertura/asignatura, la
    // fila de origen sobra (se borra); el resto se pasa al destino.
    const [tutoriasOrigen, tutoriasDestino] = await Promise.all([
      prisma.aperturaDocente.findMany({ where: { docenteId: origenId } }),
      prisma.aperturaDocente.findMany({ where: { docenteId: destinoId } }),
    ])
    const aperturasDelDestino = new Set(tutoriasDestino.map((t) => t.aperturaId))
    for (const t of tutoriasOrigen) {
      if (aperturasDelDestino.has(t.aperturaId)) {
        await prisma.aperturaDocente.delete({ where: { id: t.id } })
      } else {
        await prisma.aperturaDocente.update({ where: { id: t.id }, data: { docenteId: destinoId } })
      }
    }

    const [contenidosOrigen, contenidosDestino] = await Promise.all([
      prisma.asignaturaDocente.findMany({ where: { docenteId: origenId } }),
      prisma.asignaturaDocente.findMany({ where: { docenteId: destinoId } }),
    ])
    const asignaturasDelDestino = new Set(contenidosDestino.map((c) => c.asignaturaCodigo))
    for (const c of contenidosOrigen) {
      if (asignaturasDelDestino.has(c.asignaturaCodigo)) {
        await prisma.asignaturaDocente.delete({ where: { id: c.id } })
      } else {
        await prisma.asignaturaDocente.update({ where: { id: c.id }, data: { docenteId: destinoId } })
      }
    }

    await prisma.docente.delete({ where: { id: origenId } })
    await anotar(admin.id, `${origen.nombre} se fusionó con ${destino.nombre}`)
    revalidatePath('/docentes')
    revalidatePath('/', 'layout')
  })
}
