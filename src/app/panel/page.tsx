import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { carrerasVisibles } from '@/lib/permisos'
import { resumirAvance } from '@/lib/avance'
import { semaforo } from '@/lib/semaforo'
import { fmtFecha } from '@/lib/formato'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { SemaforoBadge } from '@/components/SemaforoBadge'

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

  const enRiesgo = periodos
    .flatMap((p) => p.aperturas.map((a) => ({ periodo: p, ap: a })))
    .map((x) => ({ ...x, sem: semaforo(x.ap.asignatura.estado as Estado, x.ap.aperturaInscripcion, hoy) }))
    .filter((x) => x.sem === 'rojo' || x.sem === 'amarillo')
    .filter((x) => !visibles || x.ap.cohortes.some((c) => visibles.includes(c.cohorte.carreraId)))
    .sort((a, b) => (a.ap.aperturaInscripcion?.getTime() ?? 0) - (b.ap.aperturaInscripcion?.getTime() ?? 0))

  const global = resumirAvance(
    carreras.flatMap((c) => c.planItems.map((p) => p.asignatura))
      .filter((a, i, arr) => arr.findIndex((x) => x.codigo === a.codigo) === i),
  )

  return (
    <main>
      <div className="encabezado-plan">
        <div>
          <h1>Panel de control</h1>
          <p className="sub">
            {global.finalizadas} de {global.total} asignaturas terminadas ({global.porcentaje}%)
            {visibles ? ' en tus carreras' : ' en total'}.
          </p>
        </div>
        <a className="boton-descarga" href="/exportar" download>Descargar planilla</a>
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
                  <div className="barra" title={`${a.porcentaje}%`}>
                    <div className="relleno" style={{ width: `${a.porcentaje}%` }} />
                    <span>{a.porcentaje}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
          {!carreras.length && (
            <tr><td colSpan={9}>Sin carreras asignadas.</td></tr>
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
      ) : <p className="vacio">No hay períodos próximos cargados.</p>}

      <h2>Requieren atención ({enRiesgo.length})</h2>
      {enRiesgo.length ? (
        <table>
          <thead>
            <tr><th>Estado de aula</th><th>Asignatura</th><th>Producción</th><th>Período</th><th>Inscripción</th></tr>
          </thead>
          <tbody>
            {enRiesgo.slice(0, 30).map(({ ap, periodo, sem }) => (
              <tr key={ap.id}>
                <td><SemaforoBadge valor={sem} /></td>
                <td>
                  <Link href={`/asignaturas/${encodeURIComponent(ap.asignaturaCodigo)}`}>
                    {ap.asignatura.nombre}
                  </Link> <small>{ap.asignaturaCodigo}</small>
                </td>
                <td>{ESTADO_LABELS[ap.asignatura.estado as Estado]}</td>
                <td><Link href={`/periodos/${periodo.id}`}>{periodo.nombre}</Link></td>
                <td>{fmtFecha(ap.aperturaInscripcion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="vacio">Ninguna asignatura próxima está en riesgo. Todo lo que abre está listo.</p>
      )}
    </main>
  )
}
