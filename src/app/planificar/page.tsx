import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarCarrera, carrerasVisibles } from '@/lib/permisos'
import { armarGrilla, type AperturaGrilla } from '@/lib/grilla'
import { estadoPeriodo } from '@/lib/estado-periodo'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import { IconoCompartida } from '@/components/iconos'
import { agregarApertura, quitarApertura, moverApertura, crearCohorte } from './actions'

export const dynamic = 'force-dynamic'

/** Cuántos períodos se muestran por defecto en la grilla, para no llenarla de columnas. */
const PERIODOS_VISIBLES = 3

export default async function Planificar({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string; todos?: string }>
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

  const { carrera: carreraParam, todos: todosParam } = await searchParams
  const carrera = carreras.find((c) => String(c.id) === carreraParam) ?? carreras[0]
  const editable = puedeEditarCarrera(s, carrera.id)
  const mostrarTodos = todosParam === '1'
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

  // Por defecto sólo se ven los períodos más cercanos a hoy, para que precargar
  // el calendario a futuro no llene la grilla de columnas. El resto sigue
  // existiendo y se puede planificar (o ver todo con el link de abajo).
  const cercanos = [...periodosTodos]
    .sort((a, b) => Math.abs(a.inicioCursado.getTime() - hoy.getTime()) - Math.abs(b.inicioCursado.getTime() - hoy.getTime()))
    .slice(0, PERIODOS_VISIBLES)
    .sort((a, b) => a.inicioCursado.getTime() - b.inicioCursado.getTime())
  const periodos = mostrarTodos ? periodosTodos : cercanos
  const hayOcultos = periodosTodos.length > periodos.length

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
  const ordenPorCodigo = new Map(plan.map((item) => [item.asignaturaCodigo, item.orden]))

  // Transversales: mismo código en el plan de otra carrera, que ya abrió el
  // período pero esta carrera todavía no se sumó — por si le sirve cursarla junta.
  const aperturasAjenasBase = codigos.length ? await prisma.apertura.findMany({
    where: { asignaturaCodigo: { in: codigos } },
    include: {
      asignatura: true,
      periodo: true,
      cohortes: { include: { cohorte: { include: { carrera: true } } } },
    },
  }) : []
  const avisos = aperturasAjenasBase
    .filter((ap) => estadoPeriodo(ap.periodo.inicioCursado, ap.cierreAsignatura, hoy) !== 'cerrado')
    .filter((ap) => !ap.cohortes.some((c) => c.cohorte.carreraId === carrera.id))
    .map((ap) => ({
      apertura: ap,
      otras: [...new Set(ap.cohortes.filter((c) => c.cohorte.carreraId !== carrera.id).map((c) => c.cohorte.carrera.nombre))],
    }))
    .filter((a) => a.otras.length > 0)
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

      {editable && cohortes.length > 0 && avisos.length > 0 && (
        <div className="avisos-transversales">
          <h2>Por si te sirve sumarte</h2>
          {avisos.map(({ apertura: ap, otras }) => (
            <div className="aviso" role="note" key={ap.id}>
              <IconoCompartida />
              <div>
                <p>
                  <strong>{ap.asignatura.nombre}</strong> es transversal y ya la abrió{' '}
                  {otras.join(', ')} en <strong>{ap.periodo.nombre}</strong>. Sumar tu cohorte
                  no crea una apertura nueva, se une a la que ya existe.
                </p>
                <form action={agregarApertura.bind(null, carrera.id)} className="en-linea">
                  <input type="hidden" name="codigo" value={ap.asignaturaCodigo} />
                  <input type="hidden" name="periodoId" value={ap.periodoId} />
                  <select name="cohorteId" defaultValue="" required aria-label={`Cohorte que suma ${ap.asignatura.nombre}`}>
                    <option value="" disabled>Elegir cohorte...</option>
                    {cohortes.map((co) => (
                      <option key={co.id} value={co.id}>{co.nombre}</option>
                    ))}
                  </select>
                  <Boton enCurso="Sumando">Sumar esta cohorte</Boton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {!cohortes.length ? (
        <div className="vacio">
          <p>
            Esta carrera todavía no tiene cohortes. Una cohorte es una camada de alumnos que
            avanza junta por el plan; el planificador arma una fila por cada una.
          </p>
          {editable && (
            <form action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Nombre de la cohorte, por ejemplo COHORTE 2026" required />
              <Boton enCurso="Creando">Crear cohorte</Boton>
            </form>
          )}
        </div>
      ) : !periodosTodos.length ? (
        <p className="vacio">
          No hay períodos cargados para {carrera.unidad.nombre}. Los períodos definen
          las fechas del ciclo (inscripción, cursado, AFI, cierre) y los carga el equipo SIED;
          sin ellos no hay dónde ubicar las asignaturas.
        </p>
      ) : (
        <>
          <p className="ayuda-grilla">
            Cada fila es una cohorte y cada columna un período. En cada celda va lo que le toca cursar
            a esa camada en ese momento.
            {hayOcultos && (
              <>
                {' '}Se muestran los {PERIODOS_VISIBLES} más cercanos a hoy.{' '}
                <Link href={`/planificar?carrera=${carrera.id}&todos=1`}>
                  Ver los {periodosTodos.length - periodos.length} períodos restantes
                </Link>
              </>
            )}
            {mostrarTodos && periodosTodos.length > PERIODOS_VISIBLES && (
              <>
                {' '}<Link href={`/planificar?carrera=${carrera.id}`}>Mostrar sólo los más cercanos</Link>
              </>
            )}
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
                {cohortes.map((co) => {
                  const sinAbrir = plan.filter((item) => !grilla.yaCursa(co.id, item.asignaturaCodigo).length)
                  return (
                  <tr key={co.id}>
                    <th scope="row" className="col-cohorte">
                      {co.nombre}
                      <small>{grilla.totalDe(co.id)} planificadas</small>
                      {sinAbrir.length > 0 && (
                        <details className="sin-abrir">
                          <summary>{sinAbrir.length} sin abrir todavía</summary>
                          <ul>
                            {sinAbrir.map((item) => (
                              <li key={item.id}>
                                {item.orden != null ? `${item.orden}. ` : ''}
                                {item.asignatura.nombre}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </th>
                    {periodos.map((p) => {
                      const enCelda = grilla.celda(co.id, p.id)
                      return (
                        <td key={p.id}>
                          {enCelda.map((ap) => (
                            <div key={ap.id} className="celda-item">
                              <Link href={`/asignaturas/${encodeURIComponent(ap.asignaturaCodigo)}`}>
                                {ordenPorCodigo.get(ap.asignaturaCodigo) != null
                                  ? `${ordenPorCodigo.get(ap.asignaturaCodigo)}. `
                                  : ''}
                                {ap.asignatura.nombre}
                              </Link>
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
                                      {periodosTodos.filter((x) => x.id !== p.id).map((x) => (
                                        <option key={x.id} value={x.id}>{x.nombre}</option>
                                      ))}
                                    </select>
                                    <Boton enCurso="Moviendo">Mover</Boton>
                                  </form>
                                  <form action={quitarApertura.bind(null, carrera.id)}>
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <Boton className="quitar" enCurso="Quitando" aria-label={`Quitar ${ap.asignatura.nombre}`}>
                                      Quitar
                                    </Boton>
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
                              <Boton enCurso="Agregando">Agregar</Boton>
                            </form>
                          ) : (
                            !enCelda.length && <span className="celda-vacia">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {editable && (
            <form action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Agregar otra cohorte, por ejemplo COHORTE 2027" required />
              <Boton enCurso="Creando">Crear cohorte</Boton>
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
    </main>
  )
}
