'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { validarFechas } from '@/lib/validar'

const TIPOS = ['mensual', 'bimestral', 'cuatrimestral'] as const

/** Lee una fecha del formulario (viene como aaaa-mm-dd) sin correrla de día. */
function fecha(form: FormData, campo: string): Date | null {
  const v = String(form.get(campo) ?? '').trim()
  if (!v) return null
  const [a, m, d] = v.split('-').map(Number)
  if (!a || !m || !d) return null
  return new Date(a, m - 1, d)
}

async function exigirPermiso() {
  const s = await sesionActual()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED define el calendario de períodos')
  }
  return s!
}

export async function crearPeriodo(formData: FormData) {
  const s = await exigirPermiso()

  const nombre = String(formData.get('nombre') ?? '').trim()
  const unidadId = String(formData.get('unidadId') ?? '')
  const tipo = String(formData.get('tipo') ?? '')
  const mes = String(formData.get('mes') ?? '').trim() || null
  const inicioCursado = fecha(formData, 'inicioCursado')

  if (!nombre) throw new Error('Poné un nombre para el período')
  if (!(TIPOS as readonly string[]).includes(tipo)) throw new Error('Tipo de período inválido')
  if (!inicioCursado) throw new Error('La fecha de inicio de cursado es obligatoria')

  const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } })
  if (!unidad) throw new Error('Unidad inexistente')

  const yaExiste = await prisma.periodo.findUnique({
    where: { unidadId_nombre: { unidadId, nombre } },
  })
  if (yaExiste) throw new Error(`Ya hay un período llamado "${nombre}" en ${unidad.nombre}`)

  const fechas = {
    inicioCursado,
    aperturaInscripcion: fecha(formData, 'aperturaInscripcion'),
    cierreInscripcion: fecha(formData, 'cierreInscripcion'),
    finCursado: fecha(formData, 'finCursado'),
    aperturaAfi: fecha(formData, 'aperturaAfi'),
    cierreAfi: fecha(formData, 'cierreAfi'),
    cierreAsignatura: fecha(formData, 'cierreAsignatura'),
    actas: fecha(formData, 'actas'),
  }

  const problemas = validarFechas(fechas)
  if (problemas.length) {
    throw new Error(`Revisá las fechas: ${problemas.join('; ')}`)
  }

  await prisma.periodo.create({ data: { nombre, unidadId, tipo, mes, ...fechas } })
  await prisma.cambio.create({
    data: {
      usuarioId: s.id,
      accion: 'creo_periodo',
      detalle: `Nuevo período ${nombre} (${unidad.nombre}, ${tipo})`,
    },
  })
  revalidatePath('/', 'layout')
}

export async function editarPeriodo(periodoId: number, formData: FormData) {
  const s = await exigirPermiso()

  const periodo = await prisma.periodo.findUnique({ where: { id: periodoId } })
  if (!periodo) throw new Error('Período inexistente')

  const inicioCursado = fecha(formData, 'inicioCursado')
  if (!inicioCursado) throw new Error('La fecha de inicio de cursado es obligatoria')

  const fechas = {
    inicioCursado,
    aperturaInscripcion: fecha(formData, 'aperturaInscripcion'),
    cierreInscripcion: fecha(formData, 'cierreInscripcion'),
    finCursado: fecha(formData, 'finCursado'),
    aperturaAfi: fecha(formData, 'aperturaAfi'),
    cierreAfi: fecha(formData, 'cierreAfi'),
    cierreAsignatura: fecha(formData, 'cierreAsignatura'),
    actas: fecha(formData, 'actas'),
  }

  const problemas = validarFechas(fechas)
  if (problemas.length) throw new Error(`Revisá las fechas: ${problemas.join('; ')}`)

  await prisma.periodo.update({ where: { id: periodoId }, data: fechas })
  await prisma.cambio.create({
    data: { usuarioId: s.id, accion: 'edito_periodo', detalle: `Fechas de ${periodo.nombre} actualizadas` },
  })
  revalidatePath('/', 'layout')
}

export async function borrarPeriodo(periodoId: number) {
  const s = await exigirPermiso()

  const periodo = await prisma.periodo.findUnique({
    where: { id: periodoId },
    include: { _count: { select: { aperturas: true } } },
  })
  if (!periodo) throw new Error('Período inexistente')
  if (periodo._count.aperturas > 0) {
    throw new Error(
      `${periodo.nombre} tiene ${periodo._count.aperturas} asignatura(s) planificada(s). ` +
      'Quitalas primero desde el planificador.',
    )
  }

  await prisma.periodo.delete({ where: { id: periodoId } })
  await prisma.cambio.create({
    data: { usuarioId: s.id, accion: 'borro_periodo', detalle: `Período ${periodo.nombre} eliminado` },
  })
  revalidatePath('/', 'layout')
}
