import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADOS, ESTADO_LABELS, type Estado } from '@/lib/estados'
import { fmtFecha, fmtFechaHora } from '@/lib/formato'
import { joinDocentes } from '@/lib/docentes'
import { IconoCompartida } from '@/components/iconos'
import { EditorDocentes } from '@/components/EditorDocentes'
import { EstadoBadge } from '@/components/EstadoBadge'
import { Boton } from '@/components/Boton'
import {
  actualizarAsignatura, crearVariante, definirVariantesRequeridas, desvincularVariante,
} from './actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const a = await prisma.asignatura.findUnique({
    where: { codigo: decodeURIComponent(codigo) },
    select: { nombre: true },
  })
  return { title: a?.nombre ?? 'Asignatura' }
}

export default async function Asignatura({ params }: { params: Promise<{ codigo: string }> }) {
  const s = await exigirSesion()

  const { codigo } = await params
  const a = await prisma.asignatura.findUnique({
    where: { codigo: decodeURIComponent(codigo) },
    include: {
      planItems: { include: { carrera: { include: { unidad: true } } }, orderBy: { orden: 'asc' } },
      aperturas: { include: { periodo: true, cohortes: { include: { cohorte: { include: { carrera: true } } } } }, orderBy: { inicioCursado: 'asc' } },
      docentes: { orderBy: { orden: 'asc' } },
      variantes: { orderBy: { codigo: 'asc' } },
      principal: true,
    },
  })
  if (!a) notFound()

  const editable = puedeEditarProduccion(s)
  const cambios = editable ? await prisma.cambio.findMany({
    where: { asignaturaCodigo: a.codigo },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
    take: 12,
  }) : []

  return (
    <main>
      <Link className="volver" href="/asignaturas">← Todas las asignaturas</Link>
      <div className="encabezado">
        <div>
          <h1>{a.nombre} <span className="codigo-asignatura">{a.codigo}</span></h1>
          <p className="sub">
            {a.catedra && <>Cátedra {a.catedra} · </>}
            {a.cargaHoraria && <>{a.cargaHoraria} h · </>}
            {a.planItems.length === 1 ? 'En 1 plan de estudio' : `En ${a.planItems.length} planes de estudio`}
          </p>
        </div>
        <div className="acciones">
          <EstadoBadge estado={a.estado} />
        </div>
      </div>

      {a.planItems.length > 1 && (
        <div className="aviso" role="note">
          <IconoCompartida />
          <p>
            <strong>Transversal.</strong> La comparten {a.planItems.map((p) => p.carrera.nombre).join(', ')}.
            Como todas usan el mismo código, al abrirla queda disponible para las {a.planItems.length} a la vez;
            cada dirección decide si su cohorte la cursa en ese momento o más adelante.
          </p>
        </div>
      )}

      <h2>Producción</h2>
      {editable ? (
        <form className="ficha" action={actualizarAsignatura.bind(null, a.codigo)}>
          <label htmlFor="estado">
            Estado
            <select id="estado" name="estado" defaultValue={a.estado}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e as Estado]}</option>
              ))}
            </select>
          </label>
          <label>Docente <EditorDocentes name="docente" iniciales={a.docentes.map((d) => d.nombre)} etiqueta={a.nombre} /></label>
          <label>Asesor <input name="asesor" defaultValue={a.asesor ?? ''} /></label>
          <button type="submit">Guardar</button>
        </form>
      ) : (
        <table>
          <tbody>
            <tr><td><strong>Estado</strong></td><td><EstadoBadge estado={a.estado} /></td></tr>
            <tr><td><strong>Docente</strong></td><td>{joinDocentes(a.docentes.map((d) => d.nombre)) || '—'}</td></tr>
            <tr><td><strong>Asesor</strong></td><td>{a.asesor ?? '—'}</td></tr>
          </tbody>
        </table>
      )}

      {a.principal && (
        <p className="ayuda">
          Es un seminario optativo de{' '}
          <Link href={`/asignaturas/${encodeURIComponent(a.principal.codigo)}`}>
            {a.principal.nombre}
          </Link>
          . No figura por sí solo en ningún plan: ayuda a cubrir ese lugar.
        </p>
      )}

      {(a.variantes.length > 0 || (editable && !a.principal)) && (
        <>
          <h2>Seminarios optativos ({a.variantes.length})</h2>
          <p className="ayuda">
            Seminarios con código propio que ayudan a cubrir este lugar del plan. Cada uno se
            produce y se abre por separado; el panel cuenta este lugar como cubierto cuando
            {' '}<strong>{a.variantesRequeridas}</strong>{' '}
            {a.variantesRequeridas === 1 ? 'esté terminado' : 'estén terminados'}, o cuando lo
            esté este mismo.
          </p>

          {a.variantes.length > 0 && (
            <table>
              <thead>
                <tr><th>Código</th><th>Seminario</th><th>Producción</th>{editable && <th></th>}</tr>
              </thead>
              <tbody>
                {a.variantes.map((v) => (
                  <tr key={v.codigo}>
                    <td><small>{v.codigo}</small></td>
                    <td>
                      <Link href={`/asignaturas/${encodeURIComponent(v.codigo)}`}>{v.nombre}</Link>
                    </td>
                    <td><EstadoBadge estado={v.estado} /></td>
                    {editable && (
                      <td>
                        <form action={desvincularVariante.bind(null, v.codigo)}>
                          <Boton className="quitar" enCurso="Desvinculando">Desvincular</Boton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {editable && (
            <>
              <form action={crearVariante.bind(null, a.codigo)} className="ficha alta-variante">
                <label htmlFor="codigo">
                  Código
                  <input id="codigo" name="codigo" placeholder="EP00501" required />
                </label>
                <label htmlFor="nombre">
                  Nombre del seminario
                  <input id="nombre" name="nombre" required />
                </label>
                <Boton enCurso="Agregando">Agregar seminario</Boton>
              </form>

              {a.variantes.length > 1 && (
                <form action={definirVariantesRequeridas.bind(null, a.codigo)} className="en-linea cuantas-hacen-falta">
                  <label htmlFor="variantesRequeridas">Hacen falta</label>
                  <input
                    id="variantesRequeridas"
                    name="variantesRequeridas"
                    type="number"
                    min={1}
                    max={a.variantes.length}
                    defaultValue={a.variantesRequeridas}
                    key={a.variantesRequeridas}
                  />
                  <Boton enCurso="Guardando">Guardar</Boton>
                </form>
              )}
            </>
          )}
        </>
      )}

      <h2>Planes de estudio</h2>
      {a.planItems.length ? (
        <table>
          <thead><tr><th>Carrera</th><th>Unidad</th><th className="num">Orden en el plan</th></tr></thead>
          <tbody>
            {a.planItems.map((p) => (
              <tr key={p.id}>
                <td>{p.carrera.nombre}</td>
                <td>{p.carrera.unidad.nombre}</td>
                <td className="num">{p.orden ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">No figura en ningún plan.</p>}

      <h2>Aperturas</h2>
      {a.aperturas.length ? (
        <table>
          <thead>
            <tr>
              <th>Período</th><th>Inscripción</th><th>Cursado</th>
              <th>AFI</th><th>Cierre</th><th>Cohortes</th>
            </tr>
          </thead>
          <tbody>
            {a.aperturas.map((ap) => (
              <tr key={ap.id}>
                <td><Link href={`/periodos/${ap.periodoId}`}>{ap.periodo.nombre}</Link></td>
                <td>{fmtFecha(ap.aperturaInscripcion)}</td>
                <td>{fmtFecha(ap.inicioCursado)} – {fmtFecha(ap.finCursado)}</td>
                <td>{fmtFecha(ap.aperturaAfi)} – {fmtFecha(ap.cierreAfi)}</td>
                <td>{fmtFecha(ap.cierreAsignatura)}</td>
                <td>
                  <small>
                    {[...new Set(ap.cohortes.map((c) => `${c.cohorte.carrera.nombre}: ${c.cohorte.nombre}`))].join(' · ') || '—'}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="vacio">Sin aperturas planificadas.</p>}

      {cambios.length > 0 && (
        <>
          <h2>Historial</h2>
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
        </>
      )}
    </main>
  )
}
