'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { exigirSesionActiva } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { validarFechas } from '@/lib/validar'
import { parseDocentes } from '@/lib/docentes'

/** Lee una fecha del formulario (viene como aaaa-mm-dd) sin correrla de día. */
function fecha(form: FormData, campo: string): Date | null {
  const v = String(form.get(campo) ?? '').trim()
  if (!v) return null
  const [a, m, d] = v.split('-').map(Number)
  if (!a || !m || !d) return null
  return new Date(a, m - 1, d)
}

/**
 * Excepción puntual: una apertura arranca más tarde que el resto del período
 * (por ejemplo, la producción se atrasó). Las fechas ya se guardan por
 * apertura desde que se crea —heredadas del período—, esto sólo habilita
 * corregirlas para ésta en particular, sin tocar el período ni las demás.
 */
export async function editarFechasApertura(aperturaId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED corrige las fechas de una apertura')
  }

  const apertura = await prisma.apertura.findUnique({
    where: { id: aperturaId },
    include: { asignatura: true },
  })
  if (!apertura) throw new Error('Apertura inexistente')

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
  }

  const problemas = validarFechas(fechas)
  if (problemas.length) {
    throw new Error(`Revisá las fechas: ${problemas.join('; ')}`)
  }

  await prisma.apertura.update({ where: { id: aperturaId }, data: fechas })
  await prisma.cambio.create({
    data: {
      usuarioId: s.id,
      accion: 'edito_fechas_apertura',
      detalle: `Fechas propias para ${apertura.asignatura.nombre} (excepción sobre el período)`,
      asignaturaCodigo: apertura.asignaturaCodigo,
    },
  })

  revalidatePath('/', 'layout')
}

/**
 * El tutor de esta apertura puntual — distinto del docente de producción,
 * que es de la asignatura en general y no cambia de una apertura a otra.
 */
export async function editarDocentesApertura(aperturaId: number, formData: FormData) {
  const s = await exigirSesionActiva()
  if (!puedeEditarProduccion(s)) {
    throw new Error('Sólo el equipo SIED edita el docente tutor')
  }

  const apertura = await prisma.apertura.findUnique({
    where: { id: aperturaId },
    include: { asignatura: true },
  })
  if (!apertura) throw new Error('Apertura inexistente')

  const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

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
    },
  })

  revalidatePath('/', 'layout')
}
