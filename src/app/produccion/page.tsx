import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { semaforo } from '@/lib/semaforo'
import { fmtFecha } from '@/lib/formato'
import { SemaforoBadge } from '@/components/SemaforoBadge'

export const dynamic = 'force-dynamic'

export default async function Produccion() {
  const asignaturas = await prisma.asignatura.findMany({
    include: {
      planItems: { include: { carrera: true } },
      aperturas: { include: { periodo: true } },
    },
    orderBy: { nombre: 'asc' },
  })
  const hoy = new Date()
  const conProxima = asignaturas.map((a) => {
    const futuras = a.aperturas
      .filter((ap) => ap.aperturaInscripcion && ap.aperturaInscripcion >= hoy)
      .sort((x, y) => x.aperturaInscripcion!.getTime() - y.aperturaInscripcion!.getTime())
    return { ...a, proxima: futuras[0] ?? null }
  })
  return (
    <main>
      <h1>Producción</h1>
      {ESTADOS.map((estado) => {
        const grupo = conProxima.filter((a) => a.estado === estado)
        if (!grupo.length) return null
        return (
          <section key={estado} className="grupo-estado">
            <h2>{ESTADO_LABELS[estado as Estado]} <span className="contador">({grupo.length})</span></h2>
            <table>
              <thead>
                <tr><th>Semáforo</th><th>Asignatura</th><th>Docente</th><th>Asesor</th><th>Próxima apertura</th><th>Inscripción</th><th>Carreras</th></tr>
              </thead>
              <tbody>
                {grupo.map((a) => (
                  <tr key={a.codigo}>
                    <td><SemaforoBadge valor={semaforo(a.estado as Estado, a.proxima?.aperturaInscripcion ?? null, hoy)} /></td>
                    <td><Link href={`/asignaturas/${encodeURIComponent(a.codigo)}`}>{a.nombre}</Link> <small>{a.codigo}</small></td>
                    <td>{a.docente ?? '—'}</td>
                    <td>{a.asesor ?? '—'}</td>
                    <td>{a.proxima ? <Link href={`/periodos/${a.proxima.periodoId}`}>{a.proxima.periodo.nombre}</Link> : '—'}</td>
                    <td>{fmtFecha(a.proxima?.aperturaInscripcion)}</td>
                    <td>{a.planItems.map((p) => p.carrera.nombre).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
      {!asignaturas.length && <p className="vacio">Todavía no hay asignaturas cargadas.</p>}
    </main>
  )
}
