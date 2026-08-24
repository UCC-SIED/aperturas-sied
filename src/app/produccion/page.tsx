import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS } from '@/lib/estados'
import { resumirAvance } from '@/lib/avance'
import { fmtFecha } from '@/lib/formato'
import { normalizarBusqueda } from '@/lib/texto'
import { EditorDocentes } from '@/components/EditorDocentes'
import { BarraGuardar } from '@/components/BarraGuardar'
import { SelectAutoSubmit } from '@/components/SelectAutoSubmit'
import { BuscadorAutoLimpia } from '@/components/BuscadorAutoLimpia'
import { IconoDescarga } from '@/components/iconos'
import { BarraAvance } from '@/components/BarraAvance'
import { guardarSeguimiento } from './actions'

export const metadata = { title: 'Seguimiento de producción' }

export const dynamic = 'force-dynamic'

export default async function Produccion({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string; q?: string; estado?: string }>
}) {
  const s = await exigirSesion()
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
          // Los seminarios optativos no tienen PlanItem propio: cuelgan de su
          // principal, así que se traen desde acá o no aparecerían nunca.
          variantes: {
            include: {
              planItems: true,
              aperturas: { include: { periodo: true } },
              docentes: { orderBy: { orden: 'asc' } },
            },
            orderBy: { codigo: 'asc' },
          },
        },
      },
    },
    orderBy: [{ orden: 'asc' }, { asignaturaCodigo: 'asc' }],
  })

  const avance = resumirAvance(
    plan.flatMap((p) => [p.asignatura, ...p.asignatura.variantes]),
  )
  const hoy = new Date()

  // Una fila por asignatura, con sus seminarios optativos justo debajo: así se
  // edita el estado de cada uno sin salir de la tabla.
  const filas = plan.flatMap((p) => [
    { orden: p.orden, asignatura: p.asignatura, esVariante: false },
    ...p.asignatura.variantes.map((v) => ({
      orden: null,
      asignatura: v,
      esVariante: true,
    })),
  ])

  const busqueda = normalizarBusqueda(q)
  const visibles = filas.filter((f) => {
    const a = f.asignatura
    const coincide =
      !busqueda ||
      normalizarBusqueda(a.nombre).includes(busqueda) ||
      normalizarBusqueda(a.codigo).includes(busqueda) ||
      a.docentes.some((d) => normalizarBusqueda(d.nombre).includes(busqueda)) ||
      normalizarBusqueda(a.asesor ?? '').includes(busqueda)
    const delEstado = !filtroEstado || a.estado === filtroEstado
    return coincide && delEstado
  })

  return (
    <main className="seguimiento">
      <div className="encabezado">
        <div>
          <h1>Seguimiento de producción</h1>
          <p className="sub">
            En qué anda cada asignatura de <strong>{carrera.nombre}</strong>. Lo que se carga acá
            es lo que ven las direcciones cuando planifican sus períodos.
          </p>
        </div>
        <div className="acciones">
          <BarraAvance porcentaje={avance.porcentaje} etiqueta={`Avance de ${carrera.nombre}`} />
          <a className="boton-descarga" href="/exportar" download>
            <IconoDescarga />
            Descargar planilla
          </a>
        </div>
      </div>

      <form className="filtros-seguimiento">
        <label htmlFor="carrera">
          Carrera
          {/* key: sin esto el select se queda mostrando la opción anterior
              cuando el servidor devuelve otra, y el filtro deja de coincidir
              con lo que muestra la tabla. */}
          <SelectAutoSubmit key={carrera.id} id="carrera" name="carrera" defaultValue={String(carrera.id)}>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c._count.planItems})
              </option>
            ))}
          </SelectAutoSubmit>
        </label>
        <label htmlFor="estado">
          Estado
          <SelectAutoSubmit key={filtroEstado} id="estado" name="estado" defaultValue={filtroEstado}>
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

      <form action={guardarSeguimiento.bind(null, carrera.id)} className="form-seguimiento">
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
                  <tr key={a.codigo} className={p.esVariante ? 'es-variante' : undefined}>
                    <td className="col-orden">{p.orden ?? '—'}</td>
                    <td className="col-asignatura">
                      {p.esVariante && <span className="marca-variante">Optativo</span>}
                      <Link href={`/asignaturas/${encodeURIComponent(a.codigo)}`}>{a.nombre}</Link>
                      <small>
                        {a.codigo}
                        {a.planItems.length > 1 && ` · en ${a.planItems.length} carreras`}
                      </small>
                    </td>
                    <td>
                      {/* key=estado: fuerza a remontar el select cuando el guardado
                          devuelve un estado nuevo. Sin esto React no toca el valor
                          mostrado de un campo no controlado, y la fila quedaba con
                          el color del estado nuevo pero la opción vieja en la lista:
                          parecía que el cambio no se había guardado. */}
                      <select
                        key={a.estado}
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

        <BarraGuardar nota={`Se guardan todas las filas de ${carrera.nombre} que hayas modificado.`} />
      </form>
    </main>
  )
}
