import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS } from '@/lib/estados'
import { resumirAvance } from '@/lib/avance'
import { fmtFecha } from '@/lib/formato'
import { normalizarBusqueda } from '@/lib/texto'
import { EditorDocentes } from '@/components/EditorDocentes'
import { Boton } from '@/components/Boton'
import { SelectAutoSubmit } from '@/components/SelectAutoSubmit'
import { BuscadorAutoLimpia } from '@/components/BuscadorAutoLimpia'
import { IconoDescarga } from '@/components/iconos'
import { guardarSeguimiento } from './actions'

export const dynamic = 'force-dynamic'

export default async function Produccion({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string; q?: string; estado?: string }>
}) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (!puedeEditarProduccion(s)) redirect('/panel')

  const { carrera: carreraParam, q = '', estado: filtroEstado = '' } = await searchParams

  const carreras = await prisma.carrera.findMany({
    include: { unidad: true, _count: { select: { planItems: true } } },
    orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }],
  })
  if (!carreras.length) {
    return (
      <main>
        <h1>Seguimiento de producción</h1>
        <p className="vacio">
          Todavía no hay carreras cargadas. Corré la migración para traer los planes de estudio.
        </p>
      </main>
    )
  }

  const carrera = carreras.find((c) => String(c.id) === carreraParam) ?? carreras[0]

  const plan = await prisma.planItem.findMany({
    where: { carreraId: carrera.id },
    include: {
      asignatura: {
        include: {
          planItems: true,
          aperturas: { include: { periodo: true } },
          docentes: { orderBy: { orden: 'asc' } },
        },
      },
    },
    orderBy: [{ orden: 'asc' }, { asignaturaCodigo: 'asc' }],
  })

  const avance = resumirAvance(plan.map((p) => p.asignatura))
  const hoy = new Date()

  const busqueda = normalizarBusqueda(q)
  const visibles = plan.filter((p) => {
    const coincide =
      !busqueda ||
      normalizarBusqueda(p.asignatura.nombre).includes(busqueda) ||
      normalizarBusqueda(p.asignatura.codigo).includes(busqueda) ||
      p.asignatura.docentes.some((d) => normalizarBusqueda(d.nombre).includes(busqueda)) ||
      normalizarBusqueda(p.asignatura.asesor ?? '').includes(busqueda)
    const delEstado = !filtroEstado || p.asignatura.estado === filtroEstado
    return coincide && delEstado
  })

  return (
    <main className="seguimiento">
      <div className="encabezado-plan">
        <div>
          <h1>Seguimiento de producción</h1>
          <p className="sub">
            En qué anda cada asignatura. Lo que se carga acá es lo que ven las direcciones
            cuando planifican sus períodos. {avance.finalizadas} de {avance.total} terminadas
            ({avance.porcentaje}%).
          </p>
        </div>
        <a className="boton-descarga" href="/exportar" download>
          <IconoDescarga />
          Descargar planilla
        </a>
      </div>

      <form className="filtros-seguimiento">
        <label htmlFor="carrera">
          Carrera
          <SelectAutoSubmit id="carrera" name="carrera" defaultValue={String(carrera.id)}>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c._count.planItems})
              </option>
            ))}
          </SelectAutoSubmit>
        </label>
        <label htmlFor="estado">
          Estado
          <SelectAutoSubmit id="estado" name="estado" defaultValue={filtroEstado}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
            ))}
          </SelectAutoSubmit>
        </label>
        <label htmlFor="q">
          Buscar
          <BuscadorAutoLimpia id="q" name="q" defaultValue={q} placeholder="Asignatura, código, docente o asesor" />
        </label>
      </form>

      <div className="resumen-estados">
        <Link
          href={`/produccion?carrera=${carrera.id}`}
          className={`chip-estado ${!filtroEstado ? 'activo' : ''}`}
        >
          <span className="n">{avance.total}</span>
          <span className="l">Todos los estados</span>
        </Link>
        {ESTADOS.map((e) => {
          const n = avance.porEstado[e]
          return (
            <Link
              key={e}
              href={`/produccion?carrera=${carrera.id}&estado=${e}`}
              className={`chip-estado ${filtroEstado === e ? 'activo' : ''} ${n === 0 ? 'en-cero' : ''}`}
            >
              <span className="n">{n}</span>
              <span className="l">{ESTADO_LABELS[e]}</span>
            </Link>
          )
        })}
      </div>

      <form action={guardarSeguimiento.bind(null, carrera.id)}>
        <div className="tabla-scroll">
          <table className="tabla-seguimiento">
            <thead>
              <tr>
                <th className="col-orden">#</th>
                <th>Asignatura</th>
                <th className="col-estado">Estado</th>
                <th>Docente</th>
                <th>Asesor</th>
                <th>Observaciones</th>
                <th>Próxima apertura</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const a = p.asignatura
                const proxima = a.aperturas
                  .filter((ap) => ap.aperturaInscripcion && ap.aperturaInscripcion >= hoy)
                  .sort((x, y) => x.aperturaInscripcion!.getTime() - y.aperturaInscripcion!.getTime())[0]
                return (
                  <tr key={p.id}>
                    <td className="col-orden">{p.orden ?? '—'}</td>
                    <td className="col-asignatura">
                      <Link href={`/asignaturas/${encodeURIComponent(a.codigo)}`}>{a.nombre}</Link>
                      <small>
                        {a.codigo}
                        {a.planItems.length > 1 && ` · en ${a.planItems.length} carreras`}
                      </small>
                    </td>
                    <td>
                      <select
                        name={`estado_${a.codigo}`}
                        defaultValue={a.estado}
                        className={`select-estado est-${a.estado}`}
                        aria-label={`Estado de ${a.nombre}`}
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <EditorDocentes
                        name={`docente_${a.codigo}`}
                        iniciales={a.docentes.map((d) => d.nombre)}
                        etiqueta={a.nombre}
                      />
                    </td>
                    <td>
                      <input
                        name={`asesor_${a.codigo}`}
                        defaultValue={a.asesor ?? ''}
                        placeholder="—"
                        aria-label={`Asesor de ${a.nombre}`}
                      />
                    </td>
                    <td>
                      <input
                        name={`observaciones_${a.codigo}`}
                        defaultValue={a.observaciones ?? ''}
                        placeholder="Qué falta, con quién se habló…"
                        aria-label={`Observaciones de ${a.nombre}`}
                      />
                    </td>
                    <td className="col-apertura">
                      {proxima ? (
                        <>
                          <small>
                            <Link href={`/periodos/${proxima.periodoId}`}>{proxima.periodo.nombre}</Link>
                            {' · insc. '}{fmtFecha(proxima.aperturaInscripcion)}
                          </small>
                        </>
                      ) : (
                        <small className="sin-apertura">sin período próximo</small>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!visibles.length && (
                <tr>
                  <td colSpan={7} className="celda-vacia">
                    Ninguna asignatura de {carrera.nombre} coincide con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="barra-guardar">
          <Boton enCurso="Guardando cambios">Guardar cambios</Boton>
          <span className="nota">
            Se guardan todas las filas de {carrera.nombre} que hayas modificado.
          </span>
        </div>
      </form>
    </main>
  )
}
