import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { fmtFecha } from '@/lib/formato'
import { joinDocentes } from '@/lib/docentes'

/**
 * Descarga la planilla de aperturas. Respeta lo que cada usuario puede ver:
 * un director sólo baja sus carreras.
 */
export async function GET() {
  const s = await exigirSesion()

  const visibles = carrerasVisibles(s)
  const aperturas = await prisma.apertura.findMany({
    include: {
      periodo: { include: { unidad: true } },
      asignatura: { include: { planItems: { include: { carrera: true } }, docentes: { orderBy: { orden: 'asc' }, include: { docente: true } } } },
      cohortes: { include: { cohorte: { include: { carrera: true } } } },
    },
    orderBy: [{ periodoId: 'asc' }, { asignaturaCodigo: 'asc' }],
  })

  const filas: Record<string, string>[] = []
  for (const ap of aperturas) {
    const carrerasDeCohorte = ap.cohortes.map((c) => c.cohorte.carrera)
    const carreras = (carrerasDeCohorte.length ? carrerasDeCohorte : ap.asignatura.planItems.map((p) => p.carrera))
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .filter((c) => !visibles || visibles.includes(c.id))

    for (const carrera of carreras) {
      const cohortes = [...new Set(
        ap.cohortes.filter((c) => c.cohorte.carreraId === carrera.id).map((c) => c.cohorte.nombre),
      )]
      filas.push({
        Unidad: ap.periodo.unidad.nombre,
        Carrera: carrera.nombre,
        Periodo: ap.periodo.nombre,
        Cohorte: cohortes.join(' / '),
        Codigo: ap.asignaturaCodigo,
        Asignatura: ap.asignatura.nombre,
        Estado: ESTADO_LABELS[ap.asignatura.estado as Estado] ?? ap.asignatura.estado,
        Catedra: ap.asignatura.catedra ?? '',
        Docente: joinDocentes(ap.asignatura.docentes.map((d) => d.docente.nombre)),
        Asesor: ap.asignatura.asesor ?? '',
        Observaciones: ap.asignatura.observaciones ?? '',
        Transversal: ap.asignatura.planItems.length > 1 ? 'Sí' : 'No',
        'Apertura inscripción': fmtFecha(ap.aperturaInscripcion),
        'Cierre inscripción': fmtFecha(ap.cierreInscripcion),
        'Inicio de cursado': fmtFecha(ap.inicioCursado),
        'Fin de cursado': fmtFecha(ap.finCursado),
        'Apertura AFI': fmtFecha(ap.aperturaAfi),
        'Vencimiento AFI': fmtFecha(ap.cierreAfi),
        'Cierre de asignatura': fmtFecha(ap.cierreAsignatura),
      })
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Aperturas')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="aperturas-${fecha}.xlsx"`,
    },
  })
}
