import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { puedeAdministrar } from '@/lib/permisos'
import { fmtFechaHora } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import { FormConError } from '@/components/FormConError'
import { crearDocente, renombrarDocente, alternarActivoDocente, fusionarDocentes } from './actions'

export const metadata = { title: 'Docentes' }

export const dynamic = 'force-dynamic'

export default async function Docentes() {
  const s = await exigirSesion()
  if (!puedeAdministrar(s)) redirect('/panel?error=sin-permiso')

  const [docentes, cambios] = await Promise.all([
    prisma.docente.findMany({
      include: { _count: { select: { tutorias: true, contenidos: true } } },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    }),
    prisma.cambio.findMany({
      where: { accion: 'gestion_docentes' },
      include: { usuario: true },
      orderBy: { fecha: 'desc' },
      take: 10,
    }),
  ])

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>Docentes</h1>
          <p className="sub">
            Catálogo único de personas que pueden ser docente tutor de una apertura o
            contenidista de una asignatura. Cargar desde acá (o elegir de la lista al
            asignar) evita que la misma persona quede escrita de formas distintas.
          </p>
        </div>
      </div>

      <h2>Dar de alta</h2>
      <FormConError action={crearDocente} className="ficha alta-usuario">
        <label htmlFor="nombre-docente">
          Nombre
          <input id="nombre-docente" name="nombre" placeholder="Nombre y apellido" required />
        </label>
        <Boton enCurso="Dando de alta">Dar de alta</Boton>
      </FormConError>

      <h2>Catálogo ({docentes.filter((d) => d.activo).length} activos de {docentes.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Asignado en</th><th>Renombrar</th><th>Fusionar con</th><th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {docentes.map((d) => (
            <tr key={d.id} className={d.activo ? undefined : 'fila-inactiva'}>
              <td>{d.nombre}</td>
              <td>
                <small>
                  {d._count.tutorias} apertura(s) · {d._count.contenidos} asignatura(s)
                </small>
              </td>
              <td>
                <FormConError action={renombrarDocente.bind(null, d.id)} className="en-linea">
                  <input
                    name="nombre"
                    defaultValue={d.nombre}
                    required
                    aria-label={`Nuevo nombre para ${d.nombre}`}
                  />
                  <Boton enCurso="Guardando">Guardar</Boton>
                </FormConError>
              </td>
              <td>
                <FormConError action={fusionarDocentes.bind(null, d.id)} className="en-linea">
                  <select name="destinoId" defaultValue="" aria-label={`Fusionar ${d.nombre} con`}>
                    <option value="" disabled>Elegir persona...</option>
                    {docentes.filter((o) => o.id !== d.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                  <Boton className="quitar" enCurso="Fusionando">Fusionar</Boton>
                </FormConError>
              </td>
              <td>
                <FormConError action={alternarActivoDocente.bind(null, d.id)}>
                  <Boton className={d.activo ? 'quitar' : undefined} enCurso="…">
                    {d.activo ? 'Dar de baja' : 'Reactivar'}
                  </Boton>
                </FormConError>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cambios.length > 0 && (
        <>
          <h2>Últimos cambios</h2>
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
