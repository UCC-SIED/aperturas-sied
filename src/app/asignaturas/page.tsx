import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'

export const dynamic = 'force-dynamic'

export default async function Asignaturas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const { q = '' } = await searchParams
  const visibles = carrerasVisibles(s)

  const asignaturas = await prisma.asignatura.findMany({
    where: {
      AND: [
        q ? { OR: [{ codigo: { contains: q } }, { nombre: { contains: q } }] } : {},
        visibles ? { planItems: { some: { carreraId: { in: visibles } } } } : {},
      ],
    },
    include: { planItems: { include: { carrera: true } }, aperturas: true },
    orderBy: { nombre: 'asc' },
    take: 300,
  })

  return (
    <main>
      <h1>Asignaturas</h1>
      <p className="sub">
        {visibles ? 'Las de tus carreras.' : 'Catálogo completo.'} Una asignatura existe una sola vez
        aunque la compartan varias carreras.
      </p>
      <form className="buscador">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o código..." aria-label="Buscar asignatura" />
        <button type="submit">Buscar</button>
      </form>
      {asignaturas.length ? (
        <div className="tabla-scroll">
          <table className="tabla-asignaturas">
            <thead>
              <tr>
                <th className="col-codigo">Código</th><th className="col-asignatura">Asignatura</th><th>Producción</th>
                <th>Docente</th><th>Asesor</th><th className="col-carreras">Carreras</th><th className="num">Aperturas</th>
              </tr>
            </thead>
            <tbody>
              {asignaturas.map((a) => (
                <tr key={a.codigo}>
                  <td><small>{a.codigo}</small></td>
                  <td>
                    <Link href={`/asignaturas/${encodeURIComponent(a.codigo)}`}>{a.nombre}</Link>
                    {a.planItems.length > 1 && <small> · transversal</small>}
                  </td>
                  <td>{ESTADO_LABELS[a.estado as Estado]}</td>
                  <td>{a.docente ?? '—'}</td>
                  <td>{a.asesor ?? '—'}</td>
                  <td><small>{a.planItems.map((p) => p.carrera.nombre).join(' · ') || '—'}</small></td>
                  <td className="num">{a.aperturas.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="vacio">{q ? `Sin resultados para “${q}”.` : 'Todavía no hay asignaturas cargadas.'}</p>
      )}
    </main>
  )
}
