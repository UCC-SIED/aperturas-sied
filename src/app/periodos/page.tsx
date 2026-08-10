import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles, puedeEditarProduccion } from '@/lib/permisos'
import { fmtFecha } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import { crearPeriodo, borrarPeriodo } from './actions'

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

export default async function Periodos() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const visibles = carrerasVisibles(s)
  const editable = puedeEditarProduccion(s)
  const filtroAperturas = visibles
    ? { cohortes: { some: { cohorte: { carreraId: { in: visibles } } } } }
    : {}

  const [periodos, unidades] = await Promise.all([
    prisma.periodo.findMany({
      include: { unidad: true, _count: { select: { aperturas: { where: filtroAperturas } } } },
      orderBy: { inicioCursado: 'desc' },
    }),
    prisma.unidad.findMany({ orderBy: { nombre: 'asc' } }),
  ])

  const hoy = new Date()
  const nombresUnidades = [...new Set(periodos.map((p) => p.unidad.nombre))]

  return (
    <main>
      <h1>Períodos</h1>
      <p className="sub">
        El calendario del año: cuándo abre la inscripción, cuándo se cursa y cuándo cierra cada
        período. Las asignaturas que se planifican heredan estas fechas.
      </p>

      {editable && (
        <details className="alta-periodo" open={!periodos.length}>
          <summary>Cargar un período</summary>
          <form action={crearPeriodo} className="ficha form-periodo">
            <div className="fila-campos">
              <label htmlFor="nombre">
                Nombre
                <input id="nombre" name="nombre" placeholder="Mensual_Marzo_2027 · Bimestre A" required />
              </label>
              <label htmlFor="unidadId">
                Unidad
                <select id="unidadId" name="unidadId" defaultValue={unidades[0]?.id}>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="tipo">
                Tipo
                <select id="tipo" name="tipo" defaultValue="mensual">
                  <option value="mensual">Mensual</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="cuatrimestral">Cuatrimestral</option>
                </select>
              </label>
              <label htmlFor="mes">
                Mes <span className="opcional">opcional</span>
                <input id="mes" name="mes" placeholder="Marzo" />
              </label>
            </div>

            <div className="fila-campos fechas">
              {CAMPOS_FECHA.map(([campo, etiqueta]) => (
                <label key={campo} htmlFor={campo}>
                  {etiqueta}
                  {campo === 'inicioCursado' && <span className="requerido"> *</span>}
                  <input
                    id={campo}
                    name={campo}
                    type="date"
                    required={campo === 'inicioCursado'}
                  />
                </label>
              ))}
            </div>

            <Boton enCurso="Creando período">Crear período</Boton>
          </form>
        </details>
      )}

      {!periodos.length ? (
        <p className="vacio">
          Todavía no hay períodos cargados.
          {editable
            ? ' Cargá el primero con el formulario de arriba: sin períodos, las direcciones no tienen dónde ubicar las asignaturas.'
            : ' El equipo SIED todavía no cargó el calendario.'}
        </p>
      ) : (
        nombresUnidades.map((u) => (
          <section key={u}>
            <h2>{u}</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th><th>Tipo</th><th>Inscripción</th><th>Cursado</th>
                  <th>AFI</th><th>Cierre</th><th className="num">Asignaturas</th><th></th>
                </tr>
              </thead>
              <tbody>
                {periodos.filter((p) => p.unidad.nombre === u).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/periodos/${p.id}`}>{p.nombre}</Link>
                      {p.mes && <small> · {p.mes}</small>}
                    </td>
                    <td>{p.tipo}</td>
                    <td>{fmtFecha(p.aperturaInscripcion)}</td>
                    <td>{fmtFecha(p.inicioCursado)}</td>
                    <td>{fmtFecha(p.aperturaAfi)}</td>
                    <td>{fmtFecha(p.cierreAsignatura)}</td>
                    <td className="num">{p._count.aperturas}</td>
                    <td>
                      {p.inicioCursado >= hoy ? (
                        <span className="sem-verde">Próximo</span>
                      ) : (
                        <small>cerrado</small>
                      )}
                      {editable && p._count.aperturas === 0 && (
                        <form action={borrarPeriodo.bind(null, p.id)} className="en-linea">
                          <Boton className="quitar" enCurso="…">Borrar</Boton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </main>
  )
}
