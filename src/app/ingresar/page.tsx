import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { iniciarSesion } from '@/lib/sesion'
import { ROL_LABELS } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

async function entrar(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '')
  const u = await prisma.usuario.findUnique({ where: { email } })
  if (!u || !u.activo) throw new Error('Usuario inexistente o dado de baja')
  await iniciarSesion(email)
  redirect('/')
}

export default async function Ingresar() {
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    include: { carreras: { include: { carrera: true } } },
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
  })

  return (
    <main className="ingreso">
      <h1>Ingresar</h1>
      <p className="ayuda">
        Elegí con qué cuenta entrar. Cuando conectemos el ingreso con la cuenta institucional
        de Google, este paso desaparece: vas a entrar directo con tu usuario de la UCC.
      </p>
      {usuarios.length ? (
        <ul className="lista-usuarios">
          {usuarios.map((u) => (
            <li key={u.id}>
              <form action={entrar}>
                <input type="hidden" name="email" value={u.email} />
                <button type="submit" className="usuario">
                  <span className="nombre">{u.nombre}</span>
                  <span className={`rol rol-${u.rol}`}>{ROL_LABELS[u.rol] ?? u.rol}</span>
                  <span className="detalle">
                    {u.rol === 'director'
                      ? u.carreras.map((c) => c.carrera.nombre).join(' · ') || 'sin carreras asignadas'
                      : u.email}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vacio">
          No hay usuarios cargados todavía. Corré <code>npx tsx migracion/usuarios.ts</code> para
          crear los iniciales.
        </p>
      )}
    </main>
  )
}
