import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { semaforo } from '@/lib/semaforo'
import { fmtFecha } from '@/lib/formato'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { SemaforoBadge } from '@/components/SemaforoBadge'

export const dynamic = 'force-dynamic'

export default async function Periodo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const periodo = await prisma.periodo.findUnique({
    where: { id: Number(id) },
    include: {
      aperturas: {
        include: {
          asignatura: { include: { planItems: { include: { carrera: true } } } },
          cohortes: { include: { cohorte: { include: { carrera: true } } } },
        },
      },
    },
  })
  if (!periodo) notFound()
  const hoy = new Date()
  type Ap = (typeof periodo.aperturas)[number]
  const porCarrera = new Map<string, Ap[]>()
  for (const ap of periodo.aperturas) {
    const carrerasCohorte = [...new Set(ap.cohortes.map((c) => c.cohorte.carrera.nombre))]
    const carreras = carrerasCohorte.length
      ? carrerasCohorte
      : [...new Set(ap.asignatura.planItems.map((p) => p.carrera.nombre))]
    for (const c of carreras.length ? carreras : ['(sin carrera)']) {
      porCarrera.set(c, [...(porCarrera.get(c) ?? []), ap])
    }
  }
  return (
    <main>
      <h1>{periodo.nombre} <small>· inicio de cursado {fmtFecha(periodo.inicioCursado)}</small></h1>
      {!periodo.aperturas.length && <p className="vacio">Este período no tiene aperturas planificadas.</p>}
      {[...porCarrera.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([carrera, aps]) => (
        <section key={carrera}>
          <h2>{carrera}</h2>
          <table>
            <thead>
              <tr><th>Semáforo</th><th>Asignatura</th><th>Estado</th><th>Docente</th><th>Asesor</th><th>Inscripción</th><th>Cohortes</th></tr>
            </thead>
            <tbody>
              {aps.map((ap) => (
                <tr key={ap.id}>
                  <td><SemaforoBadge valor={semaforo(ap.asignatura.estado as Estado, ap.aperturaInscripcion, hoy)} /></td>
                  <td>
                    <Link href={`/asignaturas/${ap.asignatura.codigo}`}>{ap.asignatura.nombre}</Link>{' '}
                    <small>{ap.asignatura.codigo}</small>
                    {ap.asignatura.planItems.length > 1 && <small> · transversal</small>}
                  </td>
                  <td>{ESTADO_LABELS[ap.asignatura.estado as Estado]}</td>
                  <td>{ap.asignatura.docente ?? '—'}</td>
                  <td>{ap.asignatura.asesor ?? '—'}</td>
                  <td>{fmtFecha(ap.aperturaInscripcion)}</td>
                  <td>{[...new Set(ap.cohortes.map((c) => c.cohorte.nombre))].join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  )
}
