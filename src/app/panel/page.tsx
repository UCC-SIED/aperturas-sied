import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { resumirAvance } from '@/lib/avance'
import { fmtFecha } from '@/lib/formato'
import { IconoDescarga } from '@/components/iconos'
import { BarraAvance } from '@/components/BarraAvance'

export const dynamic = 'force-dynamic'

export default async function Panel() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const visibles = carrerasVisibles(s)
  const hoy = new Date()

  const carreras = await prisma.carrera.findMany({
    where: visibles ? { id: { in: visibles } } : undefined,
    include: {
      unidad: true,
      planItems: { include: { asignatura: true } },
    },
    orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }],
  })

  // Próximo período por unidad, con lo que está por abrir
  const periodos = await prisma.periodo.findMany({
    where: { inicioCursado: { gte: hoy } },
    include: {
      unidad: true,
      aperturas: {
        include: {
          asignatura: true,
          cohortes: { include: { cohorte: true } },
        },
      },
    },
    orderBy: { inicioCursado: 'asc' },
  })

  const proximos = [...new Set(periodos.map((p) => p.unidadId))]
    .map((u) => periodos.find((p) => p.unidadId === u)!)
    .filter(Boolean)

  const global = resumirAvance(
    carreras.flatMap((c) => c.planItems.map((p) => p.asignatura))
      .filter((a, i, arr) => arr.findIndex((x) => x.codigo === a.codigo) === i),
  )

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>Panel de control</h1>
          <p className="sub">
            Cómo viene la producción de contenidos{visibles ? ' en tus carreras' : ' en todas las carreras'}.
          </p>
        </div>
        <div className="acciones">
          <a className="boton-descarga" href="/exportar" download>
            <IconoDescarga />
            Descargar planilla
          </a>
        </div>
      </div>

      <div className="indicadores">
        <div className="indicador destacado">
          <span className="rotulo">Avance total</span>
          <span className="valor">{global.porcentaje}%</span>
          <span className="pie">{global.finalizadas} de {global.total} terminadas</span>
        </div>
        <div className="indicador">
          <span className="rotulo">Carreras</span>
          <span className="valor">{carreras.length}</span>
          <span className="pie">{global.total} asignaturas distintas</span>
        </div>
        <div className="indicador">
          <span className="rotulo">En maquetación</span>
          <span className="valor">{global.porEstado.maquetacion}</span>
          <span className="pie">a un paso de estar listas</span>
        </div>
        <div className="indicador">
          <span className="rotulo">En construcción</span>
          <span className="valor">{global.porEstado.construccion}</span>
          <span className="pie">contenido en desarrollo</span>
        </div>
        <div className="indicador">
          <span className="rotulo">Sin novedad</span>
          <span className="valor">{global.porEstado.sin_novedad}</span>
          <span className="pie">todavía sin arrancar</span>
        </div>
      </div>

      <h2>Avance por carrera</h2>
      <table>
        <thead>
          <tr>
            <th>Carrera</th><th>Unidad</th>
            <th className="num">Total</th><th className="num">Terminadas</th>
            <th className="num">Maquetación</th><th className="num">Construcción</th>
            <th className="num">Contratación</th><th className="num">Sin novedad</th>
            <th>Avance</th>
          </tr>
        </thead>
        <tbody>
          {carreras.map((c) => {
            const a = resumirAvance(c.planItems.map((p) => p.asignatura))
            return (
              <tr key={c.id}>
                <td><Link href={`/planificar?carrera=${c.id}`}>{c.nombre}</Link></td>
                <td>{c.unidad.nombre}</td>
                <td className="num">{a.total}</td>
                <td className="num">{a.finalizadas}</td>
                <td className="num">{a.porEstado.maquetacion}</td>
                <td className="num">{a.porEstado.construccion}</td>
                <td className="num">{a.porEstado.contratacion}</td>
                <td className="num">{a.porEstado.sin_novedad}</td>
                <td>
                  <BarraAvance porcentaje={a.porcentaje} etiqueta={`Avance de ${c.nombre}`} />
                </td>
              </tr>
            )
          })}
          {!carreras.length && (
            <tr>
              <td colSpan={9} className="celda-vacia">
                No tenés carreras asignadas todavía. Pedile al equipo SIED que te las asigne
                desde Administración.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Próxima apertura</h2>
      {proximos.length ? (
        <table>
          <thead>
            <tr><th>Unidad</th><th>Período</th><th>Inscripción</th><th>Inicio de cursado</th><th className="num">Asignaturas</th></tr>
          </thead>
          <tbody>
            {proximos.map((p) => (
              <tr key={p.id}>
                <td>{p.unidad.nombre}</td>
                <td><Link href={`/periodos/${p.id}`}>{p.nombre}</Link></td>
                <td>{fmtFecha(p.aperturaInscripcion)}</td>
                <td>{fmtFecha(p.inicioCursado)}</td>
                <td className="num">{p.aperturas.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="vacio">
          No hay períodos próximos cargados. El calendario se carga desde{' '}
          <Link href="/periodos">Períodos</Link>.
        </p>
      )}
    </main>
  )
}
