import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { sesionActual } from '@/lib/sesion'
import { puedeAdministrar, ROLES, ROL_LABELS, ROL_DESCRIPCIONES } from '@/lib/permisos'
import { fmtFechaHora } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import {
  crearUsuario, cambiarRol, alternarActivo, asignarCarreras, asignarUnidad, establecerContrasena,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (!puedeAdministrar(s)) redirect('/panel')

  const [usuarios, carreras, unidades, cambios] = await Promise.all([
    prisma.usuario.findMany({
      include: { carreras: { include: { carrera: true } }, unidad: true },
      orderBy: [{ activo: 'desc' }, { rol: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.carrera.findMany({ include: { unidad: true }, orderBy: [{ unidadId: 'asc' }, { nombre: 'asc' }] }),
    prisma.unidad.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.cambio.findMany({
      where: { accion: 'gestion_usuarios' },
      include: { usuario: true },
      orderBy: { fecha: 'desc' },
      take: 10,
    }),
  ])

  return (
    <main>
      <h1>Administración</h1>

      <h2>Dar de alta</h2>
      <form action={crearUsuario} className="ficha alta-usuario">
        <label htmlFor="nombre">
          Nombre
          <input id="nombre" name="nombre" placeholder="Dirección de Empresas" required />
        </label>
        <label htmlFor="email">
          Correo institucional
          <input id="email" name="email" type="email" placeholder="alguien@ucc.edu.ar" required />
        </label>
        <label htmlFor="rol">
          Rol
          <select id="rol" name="rol" defaultValue="director">
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROL_LABELS[r]}</option>
            ))}
          </select>
        </label>
        <label htmlFor="contrasena">
          Contraseña
          <input id="contrasena" name="contrasena" type="text" placeholder="mínimo 8 caracteres" required minLength={8} />
        </label>
        <Boton enCurso="Dando de alta">Dar de alta</Boton>
      </form>

      <details className="que-hace-cada-rol">
        <summary>Qué puede hacer cada rol</summary>
        <table>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r}>
                <td><strong>{ROL_LABELS[r]}</strong></td>
                <td>{ROL_DESCRIPCIONES[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <h2>Usuarios ({usuarios.filter((u) => u.activo).length} activos de {usuarios.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Correo</th><th>Rol</th><th>Carreras</th><th>Contraseña</th><th>Acceso</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className={u.activo ? undefined : 'fila-inactiva'}>
              <td>
                {u.nombre}
                {u.id === s.id && <small> · sos vos</small>}
              </td>
              <td><small>{u.email}</small></td>
              <td>
                <form action={cambiarRol.bind(null, u.id)} className="en-linea">
                  {/* key=rol: fuerza a remontar el select cuando cambia, si no
                      el navegador se queda mostrando la opción vieja. */}
                  <select key={u.rol} name="rol" defaultValue={u.rol} aria-label={`Rol de ${u.nombre}`}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROL_LABELS[r]}</option>
                    ))}
                  </select>
                  <Boton enCurso="…">Cambiar</Boton>
                </form>
              </td>
              <td>
                {u.rol === 'director' ? (
                  <details className="carreras-de">
                    <summary>
                      {u.carreras.length
                        ? u.carreras.map((c) => c.carrera.nombre).join(' · ')
                        : 'sin carreras asignadas'}
                    </summary>
                    <form action={asignarCarreras.bind(null, u.id)} className="lista-carreras">
                      {carreras.map((c) => (
                        <label key={c.id}>
                          <input
                            type="checkbox"
                            name="carreraId"
                            value={c.id}
                            defaultChecked={u.carreras.some((x) => x.carreraId === c.id)}
                          />
                          {c.nombre} <small>{c.unidad.nombre}</small>
                        </label>
                      ))}
                      <Boton enCurso="Guardando">Guardar carreras</Boton>
                    </form>
                  </details>
                ) : u.rol === 'unidad' ? (
                  <details className="carreras-de">
                    <summary>{u.unidad ? `Todas · ${u.unidad.nombre}` : 'sin unidad asignada'}</summary>
                    <form action={asignarUnidad.bind(null, u.id)} className="en-linea">
                      <select key={u.unidadId ?? ''} name="unidadId" defaultValue={u.unidadId ?? ''} aria-label={`Unidad de ${u.nombre}`}>
                        <option value="" disabled>Elegir unidad...</option>
                        {unidades.map((un) => (
                          <option key={un.id} value={un.id}>{un.nombre}</option>
                        ))}
                      </select>
                      <Boton enCurso="Guardando">Guardar</Boton>
                    </form>
                  </details>
                ) : (
                  <small>todas</small>
                )}
              </td>
              <td>
                <details className="carreras-de">
                  <summary>{u.passwordHash ? 'definida' : 'sin definir'} · cambiar</summary>
                  <form action={establecerContrasena.bind(null, u.id)} className="en-linea">
                    <input
                      name="contrasena"
                      type="text"
                      placeholder="mínimo 8 caracteres"
                      required
                      minLength={8}
                      aria-label={`Contraseña nueva para ${u.nombre}`}
                    />
                    <Boton enCurso="Guardando">Guardar</Boton>
                  </form>
                </details>
              </td>
              <td>
                {u.id === s.id ? (
                  <span className="urgencia urg-preparar">Activo</span>
                ) : (
                  <form action={alternarActivo.bind(null, u.id)}>
                    <Boton className={u.activo ? 'quitar' : undefined} enCurso="…">
                      {u.activo ? 'Dar de baja' : 'Reactivar'}
                    </Boton>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cambios.length > 0 && (
        <>
          <h2>Últimos cambios de permisos</h2>
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
