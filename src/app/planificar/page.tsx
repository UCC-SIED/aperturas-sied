import Link from 'next/link'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { puedeEditarCarrera, puedeEditarProduccion, carrerasVisibles, puedeValidarDocentes } from '@/lib/permisos'
import { armarGrilla, type AperturaGrilla } from '@/lib/grilla'
import { estadoPeriodo } from '@/lib/estado-periodo'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import { FormConError } from '@/components/FormConError'
import { SelectAutoSubmit } from '@/components/SelectAutoSubmit'
import { IconoCompartida } from '@/components/iconos'
import { EditorDocentes } from '@/components/EditorDocentes'
import { MarcaValidado } from '@/components/MarcaValidado'
import {
  agregarApertura, quitarApertura, moverApertura, crearCohorte, descartarAviso,
  editarDocentesTutorApertura, alternarValidacionDocenteTutor,
} from './actions'

export const metadata = { title: 'Planificar aperturas' }

export const dynamic = 'force-dynamic'

/** Cuántos períodos se muestran por defecto en la grilla, para no llenarla de columnas. */
const PERIODOS_VISIBLES = 3

export default async function Planificar({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string; todos?: string }>
}) {
  const s = await exigirSesion()

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
        <p className="vacio">
          No tenés carreras asignadas todavía, así que no hay nada que planificar. Pedile al
          equipo SIED que te habilite escribiendo a{' '}
          <a href="mailto:tecnologia.sied@ucc.edu.ar">tecnologia.sied@ucc.edu.ar</a>.
        </p>
      </main>
    )
  }

  const { carrera: carreraParam, todos: todosParam } = await searchParams
  const carrera = carreras.find((c) => String(c.id) === carreraParam) ?? carreras[0]
  const editable = puedeEditarCarrera(s, carrera.id)
  const puedeVerMovimientos = puedeEditarProduccion(s)
  const puedeValidar = puedeValidarDocentes(s)
  const mostrarTodos = todosParam === '1'
  const hoy = new Date()

  const [plan, cohortes, periodosTodos] = await Promise.all([
    prisma.planItem.findMany({
      where: { carreraId: carrera.id },
      include: { asignatura: { include: { variantes: { orderBy: { codigo: 'asc' } } } } },
      orderBy: [{ orden: 'asc' }, { asignaturaCodigo: 'asc' }],
    }),
    prisma.cohorte.findMany({ where: { carreraId: carrera.id }, orderBy: { nombre: 'asc' } }),
    prisma.periodo.findMany({
      where: { unidadId: carrera.unidadId },
      orderBy: { inicioCursado: 'asc' },
    }),
  ])

  // Lo que se puede abrir como aula: cada lugar del plan y, colgando de él, sus
  // seminarios optativos. Lo que se monta es el seminario concreto, no el
  // lugar del plan, así que las variantes tienen que estar en la lista.
  const abribles = plan.flatMap((item) => [
    {
      codigo: item.asignaturaCodigo,
      etiqueta: `${item.orden != null ? `${item.orden}. ` : ''}${item.asignatura.nombre}`,
    },
    ...item.asignatura.variantes.map((v) => ({
      codigo: v.codigo,
      etiqueta: `${item.orden != null ? `${item.orden}. ` : ''}${item.asignatura.nombre} — ${v.nombre}`,
    })),
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
    include: {
      asignatura: true,
      cohortes: { include: { cohorte: { include: { carrera: true } } } },
      docentesTutor: { orderBy: { orden: 'asc' } },
    },
  })
  const aperturas: AperturaGrilla[] = aperturasBase.map((a) => ({
    id: a.id,
    asignaturaCodigo: a.asignaturaCodigo,
    periodoId: a.periodoId,
    cohorteIds: a.cohortes.map((c) => c.cohorteId),
    carrerasCompartidas: [...new Set(
      a.cohortes.filter((c) => c.cohorte.carreraId !== carrera.id).map((c) => c.cohorte.carrera.nombre),
    )],
    docentesTutor: a.docentesTutor.map((d) => d.nombre),
    docenteTutorValidado: a.docenteTutorValidado,
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
  const descartados = new Set(
    (await prisma.avisoDescartado.findMany({ where: { carreraId: carrera.id }, select: { aperturaId: true } }))
      .map((d) => d.aperturaId),
  )
  const avisos = aperturasAjenasBase
    .filter((ap) => !descartados.has(ap.id))
    .filter((ap) => estadoPeriodo(ap.periodo.inicioCursado, ap.cierreAsignatura, hoy) !== 'cerrado')
    .filter((ap) => !ap.cohortes.some((c) => c.cohorte.carreraId === carrera.id))
    .map((ap) => ({
      apertura: ap,
      otras: [...new Set(ap.cohortes.filter((c) => c.cohorte.carreraId !== carrera.id).map((c) => c.cohorte.carrera.nombre))],
    }))
    .filter((a) => a.otras.length > 0)
  const cambios = puedeVerMovimientos ? await prisma.cambio.findMany({
    where: { carreraId: carrera.id },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 8,
  }) : []

  return (
    <main className="planificador">
      <div className="encabezado encabezado-plan">
        <div>
          <h1>
            Planificar aperturas
            {!editable && <span className="sello-lectura">Sólo lectura</span>}
          </h1>
          <p className="sub">
            {carrera.nombre} · {carrera.unidad.nombre}
          </p>
        </div>
        {carreras.length > 1 && (
          <form className="selector-carrera">
            <label htmlFor="carrera">Carrera</label>
            <SelectAutoSubmit key={carrera.id} id="carrera" name="carrera" defaultValue={String(carrera.id)}>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </SelectAutoSubmit>
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
                <FormConError action={agregarApertura.bind(null, carrera.id)} className="en-linea">
                  <input type="hidden" name="codigo" value={ap.asignaturaCodigo} />
                  <input type="hidden" name="periodoId" value={ap.periodoId} />
                  <select name="cohorteId" defaultValue="" required aria-label={`Cohorte que suma ${ap.asignatura.nombre}`}>
                    <option value="" disabled>Elegir cohorte...</option>
                    {cohortes.map((co) => (
                      <option key={co.id} value={co.id}>{co.nombre}</option>
                    ))}
                  </select>
                  <Boton enCurso="Sumando">Sumar esta cohorte</Boton>
                </FormConError>
              </div>
              <FormConError action={descartarAviso.bind(null, carrera.id)}>
                <input type="hidden" name="aperturaId" value={ap.id} />
                <button type="submit" className="cerrar-aviso" aria-label={`No sumarme a ${ap.asignatura.nombre}`}>
                  ×
                </button>
              </FormConError>
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
            <FormConError action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Nombre de la cohorte, por ejemplo COHORTE 2026" required />
              <Boton enCurso="Creando">Crear cohorte</Boton>
            </FormConError>
          )}
        </div>
      ) : !periodosTodos.length ? (
        <p className="vacio">
          No hay períodos cargados para {carrera.unidad.nombre}. Los períodos definen
          las fechas del ciclo (inscripción, cursado, AFI, cierre) y los carga Administración;
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
                  <th className="relleno" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {cohortes.map((co) => {
                  const sinAbrir = abribles.filter((item) => !grilla.yaCursa(co.id, item.codigo).length)
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
                              <li key={item.codigo}>
                                {item.etiqueta}
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
                              {ap.carrerasCompartidas.length > 0 && (
                                <p className="compartida">
                                  También la abrió {ap.carrerasCompartidas.join(', ')}
                                </p>
                              )}
                              {editable ? (
                                <details className="editar-docente-tutor">
                                  <summary>
                                    {ap.docentesTutor.length
                                      ? `Docente tutor: ${ap.docentesTutor.join(' / ')}`
                                      : 'Asignar docente tutor'}
                                    {ap.docenteTutorValidado && ' ✓'}
                                  </summary>
                                  <FormConError action={editarDocentesTutorApertura.bind(null, carrera.id)} className="fila-campos">
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <EditorDocentes
                                      name="docentesTutor"
                                      iniciales={ap.docentesTutor}
                                      etiqueta={`docente tutor de ${ap.asignatura.nombre}`}
                                    />
                                    <Boton enCurso="Guardando">Guardar</Boton>
                                  </FormConError>
                                  {puedeValidar && (
                                    <FormConError action={alternarValidacionDocenteTutor.bind(null, carrera.id, ap.id)}>
                                      <Boton className={ap.docenteTutorValidado ? 'quitar' : undefined} enCurso="…">
                                        {ap.docenteTutorValidado ? 'Quitar validación' : 'Validar docente tutor'}
                                      </Boton>
                                    </FormConError>
                                  )}
                                </details>
                              ) : (
                                ap.docentesTutor.length > 0 && (
                                  <p className="compartida">
                                    Docente tutor: {ap.docentesTutor.join(' / ')}
                                    {ap.docenteTutorValidado && <MarcaValidado />}
                                  </p>
                                )
                              )}
                              {editable && (
                                <div className="celda-acciones">
                                  <FormConError action={moverApertura.bind(null, carrera.id)}>
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <select name="destinoId" defaultValue="" aria-label={`Mover ${ap.asignatura.nombre}`}>
                                      <option value="" disabled>Mover a...</option>
                                      {periodosTodos.filter((x) => x.id !== p.id).map((x) => (
                                        <option key={x.id} value={x.id}>{x.nombre}</option>
                                      ))}
                                    </select>
                                    <Boton enCurso="Moviendo">Mover</Boton>
                                  </FormConError>
                                  <FormConError action={quitarApertura.bind(null, carrera.id)}>
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <Boton className="quitar" enCurso="Quitando" aria-label={`Quitar ${ap.asignatura.nombre}`}>
                                      Quitar
                                    </Boton>
                                  </FormConError>
                                </div>
                              )}
                            </div>
                          ))}

                          {editable ? (
                            <FormConError action={agregarApertura.bind(null, carrera.id)} className="alta-celda">
                              <input type="hidden" name="periodoId" value={p.id} />
                              <input type="hidden" name="cohorteId" value={co.id} />
                              <select name="codigo" defaultValue="" aria-label={`Agregar asignatura a ${co.nombre} en ${p.nombre}`}>
                                <option value="" disabled>Elegir asignatura...</option>
                                {abribles.map((item) => {
                                  const cursadaEn = grilla.yaCursa(co.id, item.codigo)
                                  return (
                                    <option key={item.codigo} value={item.codigo}>
                                      {item.etiqueta}
                                      {cursadaEn.length ? ` — ya en ${cursadaEn.join(', ')}` : ''}
                                    </option>
                                  )
                                })}
                              </select>
                              <Boton enCurso="Agregando">Agregar</Boton>
                            </FormConError>
                          ) : (
                            !enCelda.length && <span className="celda-vacia">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="relleno" aria-hidden />
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {editable && (
            <FormConError action={crearCohorte.bind(null, carrera.id)} className="alta-cohorte">
              <input name="nombre" placeholder="Agregar otra cohorte, por ejemplo COHORTE 2027" required />
              <Boton enCurso="Creando">Crear cohorte</Boton>
            </FormConError>
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
