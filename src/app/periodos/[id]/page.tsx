import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles, puedeEditarProduccion } from '@/lib/permisos'
import { fmtFecha, fmtFechaISO } from '@/lib/formato'
import { joinDocentes } from '@/lib/docentes'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { Boton } from '@/components/Boton'
import { EditorDocentes } from '@/components/EditorDocentes'
import { editarFechasApertura, editarDocentesApertura } from './actions'

export const dynamic = 'force-dynamic'

const CAMPOS_FECHA = [
  ['aperturaInscripcion', 'Apertura de inscripción'],
  ['cierreInscripcion', 'Cierre de inscripción'],
  ['inicioCursado', 'Inicio de cursado'],
  ['finCursado', 'Límite de entregas'],
  ['aperturaAfi', 'Apertura del AFI'],
  ['cierreAfi', 'Vencimiento del AFI'],
  ['cierreAsignatura', 'Cierre de asignatura'],
  ['actas', 'Actas'],
] as const

export default async function Periodo({ params }: { params: Promise<{ id: string }> }) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const { id } = await params
  const periodo = await prisma.periodo.findUnique({
    where: { id: Number(id) },
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
      <h1>
        {periodo.nombre} <small>· {periodo.tipo} · inicio de cursado {fmtFecha(periodo.inicioCursado)}</small>
      </h1>
      <p className="sub">
        Inscripción {fmtFecha(periodo.aperturaInscripcion)} al {fmtFecha(periodo.cierreInscripcion)}
        {periodo.aperturaAfi && <> · AFI {fmtFecha(periodo.aperturaAfi)} al {fmtFecha(periodo.cierreAfi)}</>}
        {periodo.cierreAsignatura && <> · cierre {fmtFecha(periodo.cierreAsignatura)}</>}
        {' · '}{total} {total === 1 ? 'asignatura' : 'asignaturas'}
      </p>

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
                    <td>{ESTADO_LABELS[ap.asignatura.estado as Estado]}</td>
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
                                {etiqueta}
                                {campo === 'inicioCursado' && <span className="requerido"> *</span>}
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
