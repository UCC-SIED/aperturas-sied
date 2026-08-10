import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarCarrera, carrerasVisibles } from '@/lib/permisos'
import { armarGrilla, type AperturaGrilla } from '@/lib/grilla'
import { semaforo } from '@/lib/semaforo'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { SemaforoBadge } from '@/components/SemaforoBadge'
import { agregarApertura, quitarApertura, moverApertura, crearCohorte } from './actions'

export const dynamic = 'force-dynamic'

export default async function Planificar({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string }>
}) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const visibles = carrerasVisibles(s)
  const carreras = await prisma.carrera.findMany({
    where: visibles ? { id: { in: visibles } } : undefined,
    include: { unidad: true },
    orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }],
  })
  if (!carreras.length) {
    return (
      <main>
        <h1>Planificar aperturas</h1>
        <p className="vacio">No tenés carreras asignadas. Pedile al equipo SIED que te habilite.</p>
      </main>
    )
  }

  const { carrera: carreraParam } = await searchParams
  const carrera = carreras.find((c) => String(c.id) === carreraParam) ?? carreras[0]
  const editable = puedeEditarCarrera(s, carrera.id)
  const hoy = new Date()

  const [plan, cohortes, periodosTodos] = await Promise.all([
    prisma.planItem.findMany({
      where: { carreraId: carrera.id },
      include: { asignatura: true },
      orderBy: [{ orden: 'asc' }, { asignaturaCodigo: 'asc' }],
    }),
    prisma.cohorte.findMany({ where: { carreraId: carrera.id }, orderBy: { nombre: 'asc' } }),
    prisma.periodo.findMany({
      where: { unidadId: carrera.unidadId },
      orderBy: { inicioCursado: 'asc' },
    }),
  ])

  const periodos = periodosTodos.filter((p) => p.inicioCursado >= hoy)
  const pasados = periodosTodos.filter((p) => p.inicioCursado < hoy)
  const codigos = plan.map((p) => p.asignaturaCodigo)

  // Todas las aperturas de esta carrera, para saber qué cursó cada cohorte
  const aperturasBase = await prisma.apertura.findMany({
    where: {
      asignaturaCodigo: { in: codigos },
      cohortes: { some: { cohorte: { carreraId: carrera.id } } },
    },
    include: { asignatura: true, cohortes: true },
  })
  const aperturas: AperturaGrilla[] = aperturasBase.map((a) => ({
    id: a.id,
    asignaturaCodigo: a.asignaturaCodigo,
    periodoId: a.periodoId,
    cohorteIds: a.cohortes.map((c) => c.cohorteId),
    asignatura: { codigo: a.asignatura.codigo, nombre: a.asignatura.nombre, estado: a.asignatura.estado },
    aperturaInscripcion: a.aperturaInscripcion,
  }))

  const grilla = armarGrilla(cohortes, periodosTodos, aperturas)
  const cambios = await prisma.cambio.findMany({
    where: { carreraId: carrera.id },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 8,
  })

  return (
    <main className="planificador">
      <div className="encabezado-plan">
        <div>
          <h1>Planificar aperturas</h1>
          <p className="sub">
            {carrera.nombre} · {carrera.unidad.nombre}
            {!editable && ' · sólo lectura'}
          </p>
        </div>
        {carreras.length > 1 && (
          <form className="selector-carrera">
            <label htmlFor="carrera">Carrera</label>
            <select id="carrera" name="carrera" defaultValue={String(carrera.id)}>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <button type="submit">Ver</button>
          </form>
        )}
      </div>

      {!cohortes.length ? (
        <div className="vacio">
          <p>Esta carrera todavía no tiene cohortes cargadas.</p>
          {editable && (
            <form action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Nombre de la cohorte, por ejemplo COHORTE 2026" required />
              <button type="submit">Crear cohorte</button>
            </form>
          )}
        </div>
      ) : !periodos.length ? (
        <p className="vacio">No hay períodos próximos cargados para {carrera.unidad.nombre}.</p>
      ) : (
        <>
          <p className="ayuda-grilla">
            Cada fila es una cohorte y cada columna un período. En cada celda va lo que le toca cursar
            a esa camada en ese momento.
          </p>

          <div className="grilla-scroll">
            <table className="grilla">
              <thead>
                <tr>
                  <th className="col-cohorte">Cohorte</th>
                  {periodos.map((p) => (
                    <th key={p.id}>
                      <Link href={`/periodos/${p.id}`}>{p.nombre}</Link>
                      <small>inscripción {fmtFecha(p.aperturaInscripcion)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortes.map((co) => (
                  <tr key={co.id}>
                    <th scope="row" className="col-cohorte">
                      {co.nombre}
                      <small>{grilla.totalDe(co.id)} planificadas</small>
                    </th>
                    {periodos.map((p) => {
                      const enCelda = grilla.celda(co.id, p.id)
                      return (
                        <td key={p.id}>
                          {enCelda.map((ap) => (
                            <div key={ap.id} className="celda-item">
                              <Link href={`/asignaturas/${encodeURIComponent(ap.asignaturaCodigo)}`}>
                                {ap.asignatura.nombre}
                              </Link>
                              <div className="celda-meta">
                                <SemaforoBadge
                                  valor={semaforo(ap.asignatura.estado as Estado, ap.aperturaInscripcion, hoy)}
                                />
                                <span>{ESTADO_LABELS[ap.asignatura.estado as Estado]}</span>
                              </div>
                              {ap.cohorteIds.length > 1 && (
                                <p className="compartida">
                                  También la cursan otras {ap.cohorteIds.length - 1} cohorte(s)
                                </p>
                              )}
                              {editable && (
                                <div className="celda-acciones">
                                  <form action={moverApertura.bind(null, carrera.id)}>
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <select name="destinoId" defaultValue="" aria-label={`Mover ${ap.asignatura.nombre}`}>
                                      <option value="" disabled>Mover a...</option>
                                      {periodos.filter((x) => x.id !== p.id).map((x) => (
                                        <option key={x.id} value={x.id}>{x.nombre}</option>
                                      ))}
                                    </select>
                                    <button type="submit">Mover</button>
                                  </form>
                                  <form action={quitarApertura.bind(null, carrera.id)}>
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <button type="submit" className="quitar" aria-label={`Quitar ${ap.asignatura.nombre}`}>
                                      Quitar
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          ))}

                          {editable ? (
                            <form action={agregarApertura.bind(null, carrera.id)} className="alta-celda">
                              <input type="hidden" name="periodoId" value={p.id} />
                              <input type="hidden" name="cohorteId" value={co.id} />
                              <select name="codigo" defaultValue="" aria-label={`Agregar asignatura a ${co.nombre} en ${p.nombre}`}>
                                <option value="" disabled>Elegir asignatura...</option>
                                {plan.map((item) => {
                                  const cursadaEn = grilla.yaCursa(co.id, item.asignaturaCodigo)
                                  return (
                                    <option key={item.id} value={item.asignaturaCodigo}>
                                      {item.orden != null ? `${item.orden}. ` : ''}
                                      {item.asignatura.nombre}
                                      {cursadaEn.length ? ` — ya en ${cursadaEn.join(', ')}` : ''}
                                    </option>
                                  )
                                })}
                              </select>
                              <button type="submit">Agregar</button>
                            </form>
                          ) : (
                            !enCelda.length && <span className="celda-vacia">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <form action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Agregar otra cohorte, por ejemplo COHORTE 2027" required />
              <button type="submit">Crear cohorte</button>
            </form>
          )}
        </>
      )}

      {cambios.length > 0 && (
        <details className="historicos" open>
          <summary>Últimos movimientos ({cambios.length})</summary>
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
        </details>
      )}

      {pasados.length > 0 && (
        <details className="historicos">
          <summary>Períodos anteriores ({pasados.length})</summary>
          <table>
            <thead><tr><th>Período</th><th>Inicio de cursado</th></tr></thead>
            <tbody>
              {pasados.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/periodos/${p.id}`}>{p.nombre}</Link></td>
                  <td>{fmtFecha(p.inicioCursado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </main>
  )
}
