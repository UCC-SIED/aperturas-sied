import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { IconoCompartida } from '@/components/iconos'
import { EstadoBadge } from '@/components/EstadoBadge'
import { SelectAutoSubmit } from '@/components/SelectAutoSubmit'

export const metadata = { title: 'Aulas a preparar' }

export const dynamic = 'force-dynamic'

export default async function Preparar({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const s = await exigirSesion()
  if (!puedeEditarProduccion(s)) redirect('/panel?error=sin-permiso')

  const hoy = new Date()
  const { periodo: periodoParam } = await searchParams

  const periodos = await prisma.periodo.findMany({
    where: { inicioCursado: { gte: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1) } },
    include: { unidad: true, _count: { select: { aperturas: true } } },
    orderBy: { inicioCursado: 'asc' },
  })

  if (!periodos.length) {
    return (
      <main>
        <h1>Aulas a preparar</h1>
        <p className="vacio">
          No hay períodos próximos cargados. Cargá el calendario en{' '}
          <Link href="/periodos">Períodos</Link> y pedile a las direcciones que planifiquen
          sus asignaturas; acá va a aparecer lo que hay que montar en Canvas.
        </p>
      </main>
    )
  }

  const seleccionados = periodoParam
    ? periodos.filter((p) => String(p.id) === periodoParam)
    : periodos

  const aperturas = await prisma.apertura.findMany({
    where: { periodoId: { in: seleccionados.map((p) => p.id) } },
    include: {
      periodo: true,
      asignatura: { include: { planItems: { include: { carrera: true } } } },
      cohortes: { include: { cohorte: { include: { carrera: true } } } },
    },
    orderBy: { periodo: { inicioCursado: 'asc' } },
  })

  const items = aperturas
    .map((ap) => {
      const carreras = [...new Set(
        (ap.cohortes.length
          ? ap.cohortes.map((c) => c.cohorte.carrera.nombre)
          : ap.asignatura.planItems.map((p) => p.carrera.nombre)),
      )]
      return {
        aperturaId: ap.id,
        codigo: ap.asignaturaCodigo,
        nombre: ap.asignatura.nombre,
        estado: ap.asignatura.estado,
        periodoId: ap.periodoId,
        periodo: ap.periodo.nombre,
        carreras,
        cohortes: [...new Set(ap.cohortes.map((c) => c.cohorte.nombre))],
        compartida: carreras.length > 1,
      }
    })
    .sort((a, b) => a.periodoId - b.periodoId || a.nombre.localeCompare(b.nombre))

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>
            Aulas a preparar <span className="contador">({items.length})</span>
          </h1>
          <p className="sub">
            Lo que las direcciones definieron abrir. Se monta el aula cuando el contenido está en
            maquetación o terminado.
          </p>
        </div>
      </div>

      <form className="filtros-seguimiento">
        <label htmlFor="periodo">
          Período
          <SelectAutoSubmit key={periodoParam ?? ''} id="periodo" name="periodo" defaultValue={periodoParam ?? ''}>
            <option value="">Todos los próximos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {p.unidad.nombre} ({p._count.aperturas})
              </option>
            ))}
          </SelectAutoSubmit>
        </label>
      </form>

      {!items.length ? (
        <p className="vacio">
          Ninguna dirección planificó asignaturas para{' '}
          {periodoParam ? 'ese período' : 'los períodos próximos'} todavía.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Asignatura</th><th>Producción</th>
              <th>Período</th><th>Carreras y cohortes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.aperturaId}>
                <td>
                  <Link href={`/asignaturas/${encodeURIComponent(i.codigo)}`}>{i.nombre}</Link>{' '}
                  <small>{i.codigo}</small>
                  {i.compartida && (
                    <p className="una-sola-vez">
                      <IconoCompartida />
                      Misma aula para {i.carreras.length} carreras: se monta una sola vez
                    </p>
                  )}
                </td>
                <td><EstadoBadge estado={i.estado} /></td>
                <td>{i.periodo}</td>
                <td>
                  <small>
                    {i.carreras.join(' · ')}
                    {i.cohortes.length > 0 && ` — ${i.cohortes.join(', ')}`}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
