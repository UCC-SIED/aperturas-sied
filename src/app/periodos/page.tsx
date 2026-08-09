import Link from 'next/link'
import { prisma } from '@/lib/db'
import { fmtFecha } from '@/lib/formato'

export const dynamic = 'force-dynamic'

export default async function Periodos() {
  const periodos = await prisma.periodo.findMany({
    include: { unidad: true, _count: { select: { aperturas: true } } },
    orderBy: { inicioCursado: 'asc' },
  })
  if (!periodos.length) {
    return (
      <main>
        <h1>Períodos</h1>
        <p className="vacio">Todavía no hay períodos cargados. Corré la migración (npm run migrar) con los archivos en migracion/input/.</p>
      </main>
    )
  }
  const unidades = [...new Set(periodos.map((p) => p.unidad.nombre))]
  return (
    <main>
      <h1>Períodos</h1>
      {unidades.map((u) => (
        <section key={u}>
          <h2>{u}</h2>
          <table>
            <thead>
              <tr><th>Período</th><th>Tipo</th><th>Inicio de cursado</th><th>Apertura inscripción</th><th>Aperturas</th></tr>
            </thead>
            <tbody>
              {periodos.filter((p) => p.unidad.nombre === u).map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/periodos/${p.id}`}>{p.nombre}</Link></td>
                  <td>{p.tipo}</td>
                  <td>{fmtFecha(p.inicioCursado)}</td>
                  <td>{fmtFecha(p.aperturaInscripcion)}</td>
                  <td>{p._count.aperturas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  )
}
