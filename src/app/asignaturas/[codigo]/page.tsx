import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { fmtFecha } from '@/lib/formato'
import { actualizarAsignatura } from './actions'

export const dynamic = 'force-dynamic'

export default async function Asignatura({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const a = await prisma.asignatura.findUnique({
    where: { codigo: decodeURIComponent(codigo) },
    include: {
      planItems: { include: { carrera: true } },
      aperturas: { include: { periodo: true }, orderBy: { inicioCursado: 'asc' } },
    },
  })
  if (!a) notFound()
  const accion = actualizarAsignatura.bind(null, a.codigo)
  return (
    <main>
      <h1>{a.nombre} <small>{a.codigo}</small></h1>
      {a.planItems.length > 1 && (
        <p className="aviso">
          ⚠ Transversal: compartida por {a.planItems.map((p) => p.carrera.nombre).join(', ')}.
          Al abrirse queda disponible para todas a la vez.
        </p>
      )}
      <form className="ficha" action={accion}>
        <label>Estado
          <select name="estado" defaultValue={a.estado}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO_LABELS[e as Estado]}</option>
            ))}
          </select>
        </label>
        <label>Docente <input name="docente" defaultValue={a.docente ?? ''} /></label>
        <label>Asesor <input name="asesor" defaultValue={a.asesor ?? ''} /></label>
        <button type="submit">Guardar</button>
      </form>
      <h2>Planes de estudio donde figura</h2>
      {a.planItems.length ? (
        <table>
          <thead><tr><th>Carrera</th><th>Orden en el plan</th></tr></thead>
          <tbody>
            {a.planItems.map((p) => (
              <tr key={p.id}><td>{p.carrera.nombre}</td><td>{p.orden ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">No figura en ningún plan.</p>}
      <h2>Aperturas</h2>
      {a.aperturas.length ? (
        <table>
          <thead><tr><th>Período</th><th>Inscripción</th><th>Inicio cursado</th><th>Cierre asignatura</th></tr></thead>
          <tbody>
            {a.aperturas.map((ap) => (
              <tr key={ap.id}>
                <td><Link href={`/periodos/${ap.periodoId}`}>{ap.periodo.nombre}</Link></td>
                <td>{fmtFecha(ap.aperturaInscripcion)}</td>
                <td>{fmtFecha(ap.inicioCursado)}</td>
                <td>{fmtFecha(ap.cierreAsignatura)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">Sin aperturas planificadas.</p>}
    </main>
  )
}
