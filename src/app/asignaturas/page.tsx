import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'

export const dynamic = 'force-dynamic'

export default async function Asignaturas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const asignaturas = await prisma.asignatura.findMany({
    where: q ? { OR: [{ codigo: { contains: q } }, { nombre: { contains: q } }] } : undefined,
    include: { planItems: { include: { carrera: true } } },
    orderBy: { nombre: 'asc' },
    take: 300,
  })
  return (
    <main>
      <h1>Asignaturas</h1>
      <form className="buscador">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o código..." />
        <button>Buscar</button>
      </form>
      {asignaturas.length ? (
        <table>
          <thead>
            <tr><th>Código</th><th>Asignatura</th><th>Estado</th><th>Docente</th><th>Asesor</th><th>Carreras</th></tr>
          </thead>
          <tbody>
            {asignaturas.map((a) => (
              <tr key={a.codigo}>
                <td>{a.codigo}</td>
                <td><Link href={`/asignaturas/${encodeURIComponent(a.codigo)}`}>{a.nombre}</Link></td>
                <td>{ESTADO_LABELS[a.estado as Estado]}</td>
                <td>{a.docente ?? '—'}</td>
                <td>{a.asesor ?? '—'}</td>
                <td>{a.planItems.map((p) => p.carrera.nombre).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="vacio">{q ? `Sin resultados para “${q}”.` : 'Todavía no hay asignaturas cargadas.'}</p>
      )}
    </main>
  )
}
