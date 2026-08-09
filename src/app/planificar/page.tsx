import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarCarrera, carrerasVisibles } from '@/lib/permisos'
import { semaforo } from '@/lib/semaforo'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { SemaforoBadge } from '@/components/SemaforoBadge'
import { agregarApertura, quitarApertura, moverApertura } from './actions'

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

  // El plan de estudios de la carrera, en su orden
  const plan = await prisma.planItem.findMany({
    where: { carreraId: carrera.id },
    include: { asignatura: true },
    orderBy: [{ orden: 'asc' }, { asignaturaCodigo: 'asc' }],
  })
  const codigos = plan.map((p) => p.asignaturaCodigo)

  // Períodos de la unidad de la carrera, de hoy en adelante
  const periodos = await prisma.periodo.findMany({
    where: { unidadId: carrera.unidadId },
    orderBy: { inicioCursado: 'asc' },
    include: {
      aperturas: {
        where: { asignaturaCodigo: { in: codigos } },
        include: {
          asignatura: { include: { planItems: true } },
          cohortes: { include: { cohorte: true } },
        },
      },
    },
  })
  const futuros = periodos.filter((p) => p.inicioCursado >= hoy)
  const pasados = periodos.filter((p) => p.inicioCursado < hoy)

  const cohortes = await prisma.cohorte.findMany({
    where: { carreraId: carrera.id },
    orderBy: { nombre: 'asc' },
  })

  // El plan entero queda siempre a la vista: cada asignatura muestra en qué
  // períodos ya está y se puede sumar a otro (una misma materia se abre en
  // varios períodos para distintas cohortes).
  const dondeEsta = new Map<string, string[]>()
  for (const p of periodos) {
    for (const ap of p.aperturas) {
      dondeEsta.set(ap.asignaturaCodigo, [...(dondeEsta.get(ap.asignaturaCodigo) ?? []), p.nombre])
    }
  }
  const enFuturos = new Set(futuros.flatMap((p) => p.aperturas.map((a) => a.asignaturaCodigo)))
  const sinFechaProxima = plan.filter((p) => !enFuturos.has(p.asignaturaCodigo)).length

  const cambios = await prisma.cambio.findMany({
    where: { carreraId: carrera.id },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 10,
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

      <div className="tablero">
        <section className="columna pendientes">
          <header>
            <h2>Plan de estudios</h2>
            <span className="cuenta">{plan.length}</span>
          </header>
          <p className="nota">
            {plan.length
              ? <>Todas las asignaturas de la carrera. {sinFechaProxima > 0
                  ? <><strong>{sinFechaProxima}</strong> sin período próximo.</>
                  : 'Todas tienen período próximo.'}</>
              : 'Sin plan de estudios cargado.'}
          </p>
          {plan.length ? (
            <ul className="tarjetas">
              {plan.map((p) => {
                const periodosDeEsta = dondeEsta.get(p.asignaturaCodigo) ?? []
                const yaTieneProximo = enFuturos.has(p.asignaturaCodigo)
                return (
                  <li key={p.id} className={`tarjeta ${yaTieneProximo ? 'asignada' : 'libre'}`}>
                    <div className="titulo">
                      {p.orden != null && <span className="orden">{p.orden}</span>}
                      <Link href={`/asignaturas/${encodeURIComponent(p.asignaturaCodigo)}`}>
                        {p.asignatura.nombre}
                      </Link>
                    </div>
                    <div className="meta">
                      <span className="codigo">{p.asignaturaCodigo}</span>
                      <span>{ESTADO_LABELS[p.asignatura.estado as Estado]}</span>
                    </div>
                    {periodosDeEsta.length > 0 && (
                      <p className="ubicacion">Abre en {periodosDeEsta.join(', ')}</p>
                    )}
                    {editable && futuros.length > 0 && (
                      <form action={agregarApertura.bind(null, carrera.id)} className="acciones">
                        <input type="hidden" name="codigo" value={p.asignaturaCodigo} />
                        <select name="periodoId" defaultValue="" aria-label={`Período para ${p.asignatura.nombre}`}>
                          <option value="" disabled>
                            {periodosDeEsta.length ? 'Abrir también en...' : 'Abrir en...'}
                          </option>
                          {futuros.map((f) => (
                            <option key={f.id} value={f.id}>{f.nombre}</option>
                          ))}
                        </select>
                        {cohortes.length > 0 && (
                          <select name="cohorteId" defaultValue={String(cohortes[0].id)} aria-label="Cohorte">
                            {cohortes.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                        )}
                        <button type="submit">Agregar</button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="vacio chico">Esta carrera todavía no tiene plan de estudios cargado.</p>
          )}
        </section>

        {futuros.map((periodo) => (
          <section key={periodo.id} className="columna">
            <header>
              <h2><Link href={`/periodos/${periodo.id}`}>{periodo.nombre}</Link></h2>
              <span className="cuenta">{periodo.aperturas.length}</span>
            </header>
            <p className="nota">
              Cursado {fmtFecha(periodo.inicioCursado)} · inscripción {fmtFecha(periodo.aperturaInscripcion)}
            </p>
            {periodo.aperturas.length ? (
              <ul className="tarjetas">
                {periodo.aperturas.map((ap) => {
                  const transversal = ap.asignatura.planItems.length > 1
                  return (
                    <li key={ap.id} className="tarjeta">
                      <div className="titulo">
                        <Link href={`/asignaturas/${encodeURIComponent(ap.asignaturaCodigo)}`}>
                          {ap.asignatura.nombre}
                        </Link>
                      </div>
                      <div className="meta">
                        <SemaforoBadge valor={semaforo(ap.asignatura.estado as Estado, ap.aperturaInscripcion, hoy)} />
                        <span>{ESTADO_LABELS[ap.asignatura.estado as Estado]}</span>
                      </div>
                      {transversal && (
                        <p className="transversal">
                          Transversal: se abre para las {ap.asignatura.planItems.length} carreras que la comparten.
                        </p>
                      )}
                      {editable && (
                        <div className="acciones">
                          <form action={moverApertura.bind(null, carrera.id)}>
                            <input type="hidden" name="aperturaId" value={ap.id} />
                            <select name="destinoId" defaultValue="" aria-label="Mover a">
                              <option value="" disabled>Mover a...</option>
                              {futuros.filter((f) => f.id !== periodo.id).map((f) => (
                                <option key={f.id} value={f.id}>{f.nombre}</option>
                              ))}
                            </select>
                            <button type="submit">Mover</button>
                          </form>
                          <form action={quitarApertura.bind(null, carrera.id)}>
                            <input type="hidden" name="aperturaId" value={ap.id} />
                            <button type="submit" className="quitar">Quitar</button>
                          </form>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="vacio chico">Sin asignaturas todavía.</p>
            )}
          </section>
        ))}
      </div>

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
            <thead><tr><th>Período</th><th>Inicio de cursado</th><th>Asignaturas de esta carrera</th></tr></thead>
            <tbody>
              {pasados.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/periodos/${p.id}`}>{p.nombre}</Link></td>
                  <td>{fmtFecha(p.inicioCursado)}</td>
                  <td>{p.aperturas.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </main>
  )
}
