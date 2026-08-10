import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeEditarProduccion } from '@/lib/permisos'
import { ESTADO_LABELS, type Estado } from '@/lib/estados'
import { fmtFecha } from '@/lib/formato'
import {
  ordenarParaPreparar, contarPorUrgencia, urgenciaDe, diasHasta,
  URGENCIA_LABELS, DIAS_URGENTE, type ParaPreparar, type Urgencia,
} from '@/lib/preparacion'
import { IconoCompartida } from '@/components/iconos'

export const dynamic = 'force-dynamic'

export default async function Preparar({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (!puedeEditarProduccion(s)) redirect('/panel')

  const hoy = new Date()
  const { periodo: periodoParam } = await searchParams

  const periodos = await prisma.periodo.findMany({
    where: { inicioCursado: { gte: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1) } },
    include: { unidad: true, _count: { select: { aperturas: true } } },
    orderBy: { inicioCursado: 'asc' },
  })

  if (!periodos.length) {
    return (
      <main>
        <h1>Aulas a preparar</h1>
        <p className="vacio">
          No hay períodos próximos cargados. Cargá el calendario en{' '}
          <Link href="/periodos">Períodos</Link> y pedile a las direcciones que planifiquen
          sus asignaturas; acá va a aparecer lo que hay que montar en Canvas.
        </p>
      </main>
    )
  }

  const seleccionados = periodoParam
    ? periodos.filter((p) => String(p.id) === periodoParam)
    : periodos

  const aperturas = await prisma.apertura.findMany({
    where: { periodoId: { in: seleccionados.map((p) => p.id) } },
    include: {
      periodo: true,
      asignatura: { include: { planItems: { include: { carrera: true } } } },
      cohortes: { include: { cohorte: { include: { carrera: true } } } },
    },
  })

  const items: ParaPreparar[] = aperturas.map((ap) => {
    const carreras = [...new Set(
      (ap.cohortes.length
        ? ap.cohortes.map((c) => c.cohorte.carrera.nombre)
        : ap.asignatura.planItems.map((p) => p.carrera.nombre)),
    )]
    return {
      aperturaId: ap.id,
      codigo: ap.asignaturaCodigo,
      nombre: ap.asignatura.nombre,
      estado: ap.asignatura.estado,
      periodo: ap.periodo.nombre,
      aperturaInscripcion: ap.aperturaInscripcion,
      carreras,
      cohortes: [...new Set(ap.cohortes.map((c) => c.cohorte.nombre))],
      compartida: carreras.length > 1,
    }
  })

  const ordenados = ordenarParaPreparar(items, hoy)
  const cuenta = contarPorUrgencia(items, hoy)

  return (
    <main>
      <h1>Aulas a preparar</h1>
      <p className="sub">
        Lo que las direcciones definieron abrir, ordenado por urgencia. Se monta el aula cuando
        el contenido está en maquetación o terminado.
      </p>

      <form className="filtros-seguimiento">
        <label htmlFor="periodo">
          Período
          <select id="periodo" name="periodo" defaultValue={periodoParam ?? ''}>
            <option value="">Todos los próximos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {p.unidad.nombre} ({p._count.aperturas})
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Ver</button>
      </form>

      <div className="resumen-estados">
        {(['montar-ya', 'preparar', 'esperando-contenido', 'sin-fecha'] as Urgencia[]).map((u) => (
          <div key={u} className={`chip-estado urg-${u} ${cuenta[u] === 0 ? 'en-cero' : ''}`}>
            <span className="n">{cuenta[u]}</span>
            <span className="l">{URGENCIA_LABELS[u]}</span>
          </div>
        ))}
      </div>

      {!ordenados.length ? (
        <p className="vacio">
          Ninguna dirección planificó asignaturas para{' '}
          {periodoParam ? 'ese período' : 'los períodos próximos'} todavía.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Estado</th><th>Asignatura</th><th>Producción</th>
              <th>Período</th><th>Inscripción</th><th>Carreras y cohortes</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((i) => {
              const u = urgenciaDe(i.estado, i.aperturaInscripcion, hoy)
              const dias = diasHasta(i.aperturaInscripcion, hoy)
              return (
                <tr key={i.aperturaId}>
                  <td><span className={`urgencia urg-${u}`}>{URGENCIA_LABELS[u]}</span></td>
                  <td>
                    <Link href={`/asignaturas/${encodeURIComponent(i.codigo)}`}>{i.nombre}</Link>{' '}
                    <small>{i.codigo}</small>
                    {i.compartida && (
                      <p className="una-sola-vez">
                        <IconoCompartida />
                        Misma aula para {i.carreras.length} carreras: se monta una sola vez
                      </p>
                    )}
                  </td>
                  <td>{ESTADO_LABELS[i.estado as Estado]}</td>
                  <td>{i.periodo}</td>
                  <td>
                    {fmtFecha(i.aperturaInscripcion)}
                    {dias !== null && (
                      <small className={dias <= DIAS_URGENTE ? 'apremia' : undefined}>
                        {dias < 0 ? `abrió hace ${-dias} días` : dias === 0 ? 'abre hoy' : `en ${dias} días`}
                      </small>
                    )}
                  </td>
                  <td>
                    <small>
                      {i.carreras.join(' · ')}
                      {i.cohortes.length > 0 && ` — ${i.cohortes.join(', ')}`}
                    </small>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
