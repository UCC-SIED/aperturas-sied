import Link from 'next/link'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { carrerasVisibles, puedeAdministrar } from '@/lib/permisos'
import { fmtFecha } from '@/lib/formato'
import { estadoPeriodo } from '@/lib/estado-periodo'
import { Boton } from '@/components/Boton'
import { FormConError } from '@/components/FormConError'
import { SelectorUnidadTipo } from '@/components/SelectorUnidadTipo'
import { FechasDelCiclo } from '@/components/FechasDelCiclo'
import { EditarFechasPeriodo } from './EditarFechasPeriodo'
import { crearPeriodo, borrarPeriodo } from './actions'

const ESTADO_LABEL = { proximo: 'Próximo', en_curso: 'En curso', cerrado: 'cerrado' } as const

export const metadata = { title: 'Períodos' }

export const dynamic = 'force-dynamic'

export default async function Periodos() {
  const s = await exigirSesion()

  const visibles = carrerasVisibles(s)
  // El calendario lo maneja Administración: cargar, corregir y borrar períodos
  // arrastra el trabajo planificado por todas las direcciones.
  const editable = puedeAdministrar(s)
  const filtroAperturas = visibles
    ? { cohortes: { some: { cohorte: { carreraId: { in: visibles } } } } }
    : {}

  // Un director sólo ve el calendario de la unidad de sus propias carreras —
  // sin esto, una dirección de Educación veía también los períodos de Posgrado.
  const unidadesVisibles = visibles
    ? [...new Set(
        (await prisma.carrera.findMany({ where: { id: { in: visibles } }, select: { unidadId: true } }))
          .map((c) => c.unidadId),
      )]
    : null

  const [periodos, unidades] = await Promise.all([
    prisma.periodo.findMany({
      where: unidadesVisibles ? { unidadId: { in: unidadesVisibles } } : undefined,
      include: { unidad: true, _count: { select: { aperturas: { where: filtroAperturas } } } },
      orderBy: { inicioCursado: 'desc' },
    }),
    prisma.unidad.findMany({ orderBy: { nombre: 'asc' } }),
  ])

  const hoy = new Date()
  const nombresUnidades = [...new Set(periodos.map((p) => p.unidad.nombre))]

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>
            Períodos <span className="contador">({periodos.length})</span>
          </h1>
          <p className="sub">
            El calendario del año: cuándo abre la inscripción, cuándo se cursa y cuándo cierra
            cada período. Las asignaturas que se planifican heredan estas fechas.
          </p>
        </div>
      </div>

      {editable && (
        <details className="alta-periodo" open={!periodos.length}>
          <summary>Cargar un período</summary>
          <FormConError action={crearPeriodo} className="ficha form-periodo">
            <div className="fila-campos">
              <label htmlFor="nombre">
                Nombre
                <input id="nombre" name="nombre" required />
              </label>
              <SelectorUnidadTipo unidades={unidades} />
            </div>

            <FechasDelCiclo />

            <Boton enCurso="Creando período">Crear período</Boton>
          </FormConError>
        </details>
      )}

      {!periodos.length ? (
        <p className="vacio">
          Todavía no hay períodos cargados.
          {editable
            ? ' Cargá el primero con el formulario de arriba: sin períodos, las direcciones no tienen dónde ubicar las asignaturas.'
            : ' Administración todavía no cargó el calendario.'}
        </p>
      ) : (
        nombresUnidades.map((u) => (
          <section key={u}>
            {nombresUnidades.length > 1 && <h2>{u}</h2>}
            <table>
              <thead>
                <tr>
                  <th>Período</th><th>Tipo</th><th>Inscripción</th><th>Cursado</th>
                  <th>AFI</th><th>Cierre</th><th className="num">Asignaturas</th>
                  {editable && <th></th>}<th></th>
                </tr>
              </thead>
              <tbody>
                {periodos.filter((p) => p.unidad.nombre === u).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/periodos/${p.id}`}>{p.nombre}</Link>
                    </td>
                    <td>{p.tipo}</td>
                    <td>{fmtFecha(p.aperturaInscripcion)}</td>
                    <td>{fmtFecha(p.inicioCursado)}</td>
                    <td>{fmtFecha(p.aperturaAfi)}</td>
                    <td>{fmtFecha(p.cierreAsignatura)}</td>
                    <td className="num">{p._count.aperturas}</td>
                    {editable && (
                      <td><EditarFechasPeriodo periodo={p} /></td>
                    )}
                    <td>
                      {(() => {
                        const estado = estadoPeriodo(p.inicioCursado, p.cierreAsignatura, hoy)
                        if (estado === 'cerrado') return <small>{ESTADO_LABEL.cerrado}</small>
                        return (
                          <span className={estado === 'proximo' ? 'sem-verde' : 'sem-amarillo'}>
                            {ESTADO_LABEL[estado]}
                          </span>
                        )
                      })()}
                      {editable && p._count.aperturas === 0 && (
                        <FormConError action={borrarPeriodo.bind(null, p.id)} className="en-linea">
                          <Boton className="quitar" enCurso="…">Borrar</Boton>
                        </FormConError>
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
