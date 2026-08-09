import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { fmtFecha } from '@/lib/formato'

export const dynamic = 'force-dynamic'

export default async function Periodos() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const visibles = carrerasVisibles(s)
  // Un director sólo cuenta las aperturas que le corresponden
  const filtroAperturas = visibles
    ? { cohortes: { some: { cohorte: { carreraId: { in: visibles } } } } }
    : {}

  const periodos = await prisma.periodo.findMany({
    include: {
      unidad: true,
      _count: { select: { aperturas: { where: filtroAperturas } } },
    },
    orderBy: { inicioCursado: 'desc' },
  })

  if (!periodos.length) {
    return (
      <main>
        <h1>Períodos</h1>
        <p className="vacio">
          Todavía no hay períodos cargados. Corré <code>npm run migrar</code> con los archivos en{' '}
          <code>migracion/input/</code>.
        </p>
      </main>
    )
  }

  const hoy = new Date()
  const unidades = [...new Set(periodos.map((p) => p.unidad.nombre))]

  return (
    <main>
      <h1>Períodos</h1>
      <p className="sub">
        {visibles ? 'Aperturas de tus carreras en cada período.' : 'Calendario completo de las dos unidades.'}
      </p>
      {unidades.map((u) => {
        const dePeriodo = periodos.filter((p) => p.unidad.nombre === u)
        return (
          <section key={u}>
            <h2>{u}</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th><th>Tipo</th><th>Inscripción</th><th>Inicio de cursado</th>
                  <th>Cierre</th><th className="num">Asignaturas</th><th></th>
                </tr>
              </thead>
              <tbody>
                {dePeriodo.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/periodos/${p.id}`}>{p.nombre}</Link></td>
                    <td>{p.tipo}</td>
                    <td>{fmtFecha(p.aperturaInscripcion)}</td>
                    <td>{fmtFecha(p.inicioCursado)}</td>
                    <td>{fmtFecha(p.cierreAsignatura)}</td>
                    <td className="num">{p._count.aperturas}</td>
                    <td>
                      {p.inicioCursado >= hoy
                        ? <span className="sem-verde">Próximo</span>
                        : <small>cerrado</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </main>
  )
}
