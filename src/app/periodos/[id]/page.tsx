import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { idNumerico } from '@/lib/rutas'
import { carrerasVisibles, puedeEditarProduccion } from '@/lib/permisos'
import { fmtFecha, fmtFechaISO } from '@/lib/formato'
import { joinDocentes } from '@/lib/docentes'
import { Boton } from '@/components/Boton'
import { EditorDocentes } from '@/components/EditorDocentes'
import { EstadoBadge } from '@/components/EstadoBadge'
import { editarFechasApertura, editarDocentesApertura } from './actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numero = idNumerico(id)
  if (numero === null) return { title: 'Período' }
  const p = await prisma.periodo.findUnique({ where: { id: numero }, select: { nombre: true } })
  return { title: p?.nombre ?? 'Período' }
}

const CAMPOS_FECHA = [
  ['aperturaInscripcion', 'Apertura de inscripción'],
  ['cierreInscripcion', 'Cierre de inscripción'],
  ['inicioCursado', 'Inicio de cursado'],
  ['finCursado', 'Límite de entregas'],
  ['aperturaAfi', 'Apertura del AFI'],
  ['cierreAfi', 'Vencimiento del AFI'],
  ['cierreAsignatura', 'Cierre de asignatura'],
] as const

export default async function Periodo({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSesion()

  const { id } = await params
  // Una dirección inventada no llega a la base: contesta que no existe.
  const numero = idNumerico(id)
  if (numero === null) notFound()

  const periodo = await prisma.periodo.findUnique({
    where: { id: numero },
    include: {
      aperturas: {
        include: {
          asignatura: { include: { planItems: { include: { carrera: true } }, docentes: { orderBy: { orden: 'asc' } } } },
          cohortes: { include: { cohorte: { include: { carrera: true } } } },
          docentesTutor: { orderBy: { orden: 'asc' } },
        },
      },
    },
  })
  if (!periodo) notFound()

  const visibles = carrerasVisibles(s)
  const editable = puedeEditarProduccion(s)
  type Ap = (typeof periodo.aperturas)[number]

  // Cada apertura se muestra bajo las carreras que la cursan; una transversal
  // aparece en todas las que la comparten.
  const porCarrera = new Map<string, { id: number; aperturas: Ap[] }>()
  for (const ap of periodo.aperturas) {
    const deCohortes = ap.cohortes.map((c) => c.cohorte.carrera)
    const dePlan = ap.asignatura.planItems.map((p) => p.carrera)
    const carreras = (deCohortes.length ? deCohortes : dePlan)
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .filter((c) => !visibles || visibles.includes(c.id))
    for (const c of carreras) {
      const actual = porCarrera.get(c.nombre) ?? { id: c.id, aperturas: [] }
      actual.aperturas.push(ap)
      porCarrera.set(c.nombre, actual)
    }
  }

  const grupos = [...porCarrera.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const total = grupos.reduce((n, [, g]) => n + g.aperturas.length, 0)

  return (
    <main>
      <Link className="volver" href="/periodos">← Todos los períodos</Link>
      <div className="encabezado">
        <div>
          <h1>
            {periodo.nombre} <span className="contador">· {periodo.tipo}</span>
          </h1>
          <p className="sub">
            {total} {total === 1 ? 'asignatura planificada' : 'asignaturas planificadas'} en este período.
          </p>
        </div>
      </div>

      <dl className="fechas-periodo">
        <div>
          <dt>Inscripción</dt>
          <dd>{fmtFecha(periodo.aperturaInscripcion)} – {fmtFecha(periodo.cierreInscripcion)}</dd>
        </div>
        <div>
          <dt>Cursado</dt>
          <dd>{fmtFecha(periodo.inicioCursado)} – {fmtFecha(periodo.finCursado)}</dd>
        </div>
        <div>
          <dt>AFI</dt>
          <dd>{fmtFecha(periodo.aperturaAfi)} – {fmtFecha(periodo.cierreAfi)}</dd>
        </div>
        <div>
          <dt>Cierre de asignatura</dt>
          <dd>{fmtFecha(periodo.cierreAsignatura)}</dd>
        </div>
      </dl>

      {!grupos.length && (
        <p className="vacio">
          {visibles
            ? 'Ninguna de tus carreras tiene asignaturas planificadas en este período.'
            : 'Este período no tiene aperturas planificadas.'}
        </p>
      )}

      {grupos.map(([carrera, grupo]) => (
        <section key={carrera}>
          <h2>{carrera}</h2>
          <table>
            <thead>
              <tr>
                <th>Asignatura</th><th>Producción</th>
                <th>Docente</th><th>Docente tutor</th><th>Asesor</th><th>Cohortes</th>
                {editable && <th>Fechas</th>}
              </tr>
            </thead>
            <tbody>
              {grupo.aperturas.map((ap) => {
                const cohortesDeEsta = [...new Set(
                  ap.cohortes.filter((c) => c.cohorte.carreraId === grupo.id).map((c) => c.cohorte.nombre),
                )]
                return (
                  <tr key={ap.id}>
                    <td>
                      <Link href={`/asignaturas/${encodeURIComponent(ap.asignatura.codigo)}`}>
                        {ap.asignatura.nombre}
                      </Link>{' '}
                      <small>{ap.asignatura.codigo}</small>
                      {ap.asignatura.planItems.length > 1 && <small> · transversal</small>}
                    </td>
                    <td><EstadoBadge estado={ap.asignatura.estado} /></td>
                    <td>{joinDocentes(ap.asignatura.docentes.map((d) => d.nombre)) || '—'}</td>
                    <td>
                      {editable ? (
                        <details className="editar-docente-tutor">
                          <summary>{joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || 'Asignar'}</summary>
                          <form action={editarDocentesApertura.bind(null, ap.id)} className="fila-campos">
                            <EditorDocentes
                              name="docentesTutor"
                              iniciales={ap.docentesTutor.map((d) => d.nombre)}
                              etiqueta="docente tutor de esta apertura"
                            />
                            <Boton enCurso="Guardando">Guardar</Boton>
                          </form>
                        </details>
                      ) : (
                        joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || '—'
                      )}
                    </td>
                    <td>{ap.asignatura.asesor ?? '—'}</td>
                    <td>{cohortesDeEsta.join(', ') || '—'}</td>
                    {editable && (
                      <td>
                        <details className="editar-fechas-apertura">
                          <summary>Editar</summary>
                          <form action={editarFechasApertura.bind(null, ap.id)} className="fila-campos fechas">
                            {CAMPOS_FECHA.map(([campo, etiqueta]) => (
                              <label key={campo} htmlFor={`${campo}_${ap.id}`}>
                                <span>
                                  {etiqueta}
                                  {campo === 'inicioCursado' && <span className="requerido"> *</span>}
                                </span>
                                <input
                                  id={`${campo}_${ap.id}`}
                                  name={campo}
                                  type="date"
                                  defaultValue={fmtFechaISO(ap[campo])}
                                  required={campo === 'inicioCursado'}
                                />
                              </label>
                            ))}
                            <Boton enCurso="Guardando">Guardar fechas</Boton>
                          </form>
                          <p className="nota-excepcion">
                            Corrige sólo esta apertura, no el período — para cuando la producción
                            se atrasa y arranca unos días después que el resto.
                          </p>
                        </details>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  )
}
