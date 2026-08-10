import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { iniciarSesion, googleActivo } from '@/lib/sesion'
import { signIn } from '@/auth'
import { ROL_LABELS } from '@/lib/permisos'
import { Boton } from '@/components/Boton'
import { IconoGoogle } from '@/components/iconos'

export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  dominio: 'Esa cuenta no es de la universidad. Entrá con tu correo @ucc.edu.ar.',
  'sin-alta': 'Tu cuenta todavía no está habilitada en el sistema. Escribile a tecnologia.sied@ucc.edu.ar para que te den de alta.',
  inactivo: 'Tu acceso está dado de baja. Si creés que es un error, escribile a tecnologia.sied@ucc.edu.ar.',
  AccessDenied: 'No se pudo completar el ingreso. Probá de nuevo o escribile a tecnologia.sied@ucc.edu.ar.',
}

async function entrarConGoogle() {
  'use server'
  await signIn('google', { redirectTo: '/' })
}

async function entrarComo(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '')
  const u = await prisma.usuario.findUnique({ where: { email } })
  if (!u || !u.activo) throw new Error('Usuario inexistente o dado de baja')
  await iniciarSesion(email)
  redirect('/')
}

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const conGoogle = googleActivo()

  return (
    <main className="ingreso">
      <h1>Aperturas SIED</h1>
      <p className="ayuda">Gestión de aperturas de aulas en Canvas.</p>

      {error && <p className="mensaje-error">{MENSAJES[error] ?? MENSAJES.AccessDenied}</p>}

      {conGoogle ? (
        <form action={entrarConGoogle} className="ingreso-google">
          <Boton className="boton-google" enCurso="Conectando con Google">
            <IconoGoogle />
            Entrar con mi cuenta institucional
          </Boton>
          <p className="nota-ingreso">
            Se ingresa con la cuenta <strong>@ucc.edu.ar</strong>. Si tu cuenta todavía no está
            habilitada, pedila a tecnologia.sied@ucc.edu.ar.
          </p>
        </form>
      ) : (
        <SelectorLocal />
      )}
    </main>
  )
}

/** Modo de prueba: sin Google configurado, se elige con qué cuenta mirar. */
async function SelectorLocal() {
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    include: { carreras: { include: { carrera: true } } },
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
  })

  if (!usuarios.length) {
    return (
      <p className="vacio">
        No hay usuarios cargados. Corré <code>npm run usuarios</code> para crear los iniciales.
      </p>
    )
  }

  return (
    <>
      <p className="nota-ingreso">
        El ingreso con Google todavía no está configurado, así que se elige la cuenta de la lista.
        Cuando se configure, este paso desaparece.
      </p>
      <ul className="lista-usuarios">
        {usuarios.map((u) => (
          <li key={u.id}>
            <form action={entrarComo}>
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
    </>
  )
}
