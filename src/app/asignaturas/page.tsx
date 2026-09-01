import Link from 'next/link'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { joinDocentes } from '@/lib/docentes'
import { EstadoBadge } from '@/components/EstadoBadge'
import { IconoBuscar } from '@/components/iconos'

export const metadata = { title: 'Asignaturas' }

export const dynamic = 'force-dynamic'

export default async function Asignaturas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await exigirSesion()

  const { q = '' } = await searchParams
  const visibles = carrerasVisibles(s)

  const asignaturas = await prisma.asignatura.findMany({
    where: {
      AND: [
        q ? { OR: [{ codigo: { contains: q } }, { nombre: { contains: q } }] } : {},
        // Un seminario optativo no tiene plan propio: pertenece al de su
        // principal, así que se filtra por ahí o no lo vería nadie.
        visibles
          ? {
              OR: [
                { planItems: { some: { carreraId: { in: visibles } } } },
                { principal: { planItems: { some: { carreraId: { in: visibles } } } } },
              ],
            }
          : {},
      ],
    },
    include: {
      planItems: { include: { carrera: true } },
      aperturas: true,
      docentes: { orderBy: { orden: 'asc' }, include: { docente: true } },
      principal: true,
    },
    orderBy: { nombre: 'asc' },
    take: 300,
  })

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>
            Asignaturas <span className="contador">({asignaturas.length})</span>
          </h1>
          <p className="sub">
            {visibles ? 'Las de tus carreras.' : 'Catálogo completo.'} Una asignatura existe una sola
            vez aunque la compartan varias carreras.
          </p>
        </div>
      </div>
      <form className="buscador">
        <div className="caja-busqueda">
          <IconoBuscar />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar asignatura"
          />
        </div>
        <button type="submit">Buscar</button>
        {q && <a className="limpiar-filtro" href="/asignaturas">Limpiar</a>}
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
                    {a.principal && <small> · seminario optativo</small>}
                  </td>
                  <td><EstadoBadge estado={a.estado} /></td>
                  <td>{joinDocentes(a.docentes.map((d) => d.docente.nombre)) || '—'}</td>
                  <td>{a.asesor ?? '—'}</td>
                  <td>
                    <small>
                      {a.principal
                        ? `Depende de ${a.principal.nombre}`
                        : a.planItems.map((p) => p.carrera.nombre).join(' · ') || '—'}
                    </small>
                  </td>
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
