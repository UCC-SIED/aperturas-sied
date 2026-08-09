import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { semaforo } from '@/lib/semaforo'
import { SemaforoBadge } from '@/components/SemaforoBadge'
import { actualizarAsignatura } from './actions'

export const dynamic = 'force-dynamic'

export default async function Asignatura({ params }: { params: Promise<{ codigo: string }> }) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const { codigo } = await params
  const a = await prisma.asignatura.findUnique({
    where: { codigo: decodeURIComponent(codigo) },
    include: {
      planItems: { include: { carrera: { include: { unidad: true } } }, orderBy: { orden: 'asc' } },
      aperturas: { include: { periodo: true, cohortes: { include: { cohorte: { include: { carrera: true } } } } }, orderBy: { inicioCursado: 'asc' } },
    },
  })
  if (!a) notFound()

  const editable = puedeEditarProduccion(s)
  const hoy = new Date()
  const cambios = await prisma.cambio.findMany({
    where: { asignaturaCodigo: a.codigo },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 12,
  })

  return (
    <main>
      <h1>{a.nombre} <small>{a.codigo}</small></h1>
      <p className="sub">
        {a.catedra && <>Cátedra {a.catedra} · </>}
        {a.cargaHoraria && <>{a.cargaHoraria} h · </>}
        {ESTADO_LABELS[a.estado as Estado]}
      </p>

      {a.planItems.length > 1 && (
        <p className="aviso">
          <strong>Transversal.</strong> La comparten {a.planItems.map((p) => p.carrera.nombre).join(', ')}.
          Como todas usan el mismo código, al abrirla queda disponible para las {a.planItems.length} a la vez;
          cada dirección decide si su cohorte la cursa en ese momento o más adelante.
        </p>
      )}

      <h2>Producción</h2>
      {editable ? (
        <form className="ficha" action={actualizarAsignatura.bind(null, a.codigo)}>
          <label htmlFor="estado">
            Estado
            <select id="estado" name="estado" defaultValue={a.estado}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e as Estado]}</option>
              ))}
            </select>
          </label>
          <label>Docente <input name="docente" defaultValue={a.docente ?? ''} /></label>
          <label>Asesor <input name="asesor" defaultValue={a.asesor ?? ''} /></label>
          <button type="submit">Guardar</button>
        </form>
      ) : (
        <table>
          <tbody>
            <tr><td><strong>Estado</strong></td><td>{ESTADO_LABELS[a.estado as Estado]}</td></tr>
            <tr><td><strong>Docente</strong></td><td>{a.docente ?? '—'}</td></tr>
            <tr><td><strong>Asesor</strong></td><td>{a.asesor ?? '—'}</td></tr>
          </tbody>
        </table>
      )}

      <h2>Planes de estudio</h2>
      {a.planItems.length ? (
        <table>
          <thead><tr><th>Carrera</th><th>Unidad</th><th className="num">Orden en el plan</th></tr></thead>
          <tbody>
            {a.planItems.map((p) => (
              <tr key={p.id}>
                <td>{p.carrera.nombre}</td>
                <td>{p.carrera.unidad.nombre}</td>
                <td className="num">{p.orden ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">No figura en ningún plan.</p>}

      <h2>Aperturas</h2>
      {a.aperturas.length ? (
        <table>
          <thead>
            <tr>
              <th>Estado</th><th>Período</th><th>Inscripción</th><th>Cursado</th>
              <th>AFI</th><th>Cierre</th><th>Cohortes</th>
            </tr>
          </thead>
          <tbody>
            {a.aperturas.map((ap) => (
              <tr key={ap.id}>
                <td><SemaforoBadge valor={semaforo(a.estado as Estado, ap.aperturaInscripcion, hoy)} /></td>
                <td><Link href={`/periodos/${ap.periodoId}`}>{ap.periodo.nombre}</Link></td>
                <td>{fmtFecha(ap.aperturaInscripcion)}</td>
                <td>{fmtFecha(ap.inicioCursado)} – {fmtFecha(ap.finCursado)}</td>
                <td>{fmtFecha(ap.aperturaAfi)} – {fmtFecha(ap.cierreAfi)}</td>
                <td>{fmtFecha(ap.cierreAsignatura)}</td>
                <td>
                  <small>
                    {[...new Set(ap.cohortes.map((c) => `${c.cohorte.carrera.nombre}: ${c.cohorte.nombre}`))].join(' · ') || '—'}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">Sin aperturas planificadas.</p>}

      {cambios.length > 0 && (
        <>
          <h2>Historial</h2>
          <table>
            <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué pasó</th></tr></thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.id}>
                  <td><small>{fmtFechaHora(c.fecha)}</small></td>
                  <td>{c.usuario?.nombre ?? 'Sistema'}</td>
                  <td>{c.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
