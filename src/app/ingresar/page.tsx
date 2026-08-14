import { googleActivo } from '@/lib/sesion'
import { signIn } from '@/auth'
import { Boton } from '@/components/Boton'
import { IconoGoogle } from '@/components/iconos'
import { entrarConCredenciales } from './actions'

export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  dominio: 'Esa cuenta no es de la universidad. Entrá con tu correo @ucc.edu.ar.',
  'sin-alta': 'Tu cuenta todavía no está habilitada en el sistema. Escribile a tecnologia.sied@ucc.edu.ar para que te den de alta.',
  inactivo: 'Tu acceso está dado de baja. Si creés que es un error, escribile a tecnologia.sied@ucc.edu.ar.',
  credenciales: 'Correo o contraseña incorrectos.',
  'sin-contrasena': 'Tu cuenta todavía no tiene contraseña definida. Pedile al equipo SIED que te la cargue en Administración.',
  AccessDenied: 'No se pudo completar el ingreso. Probá de nuevo o escribile a tecnologia.sied@ucc.edu.ar.',
}

async function entrarConGoogle() {
  'use server'
  await signIn('google', { redirectTo: '/' })
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
      <h1>Gestión de Asignaturas SIED</h1>
      <p className="ayuda">Aperturas de aulas y seguimiento de producción en Canvas.</p>

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
        <form action={entrarConCredenciales} className="ficha ingreso-credenciales">
          <label htmlFor="email">
            Correo institucional
            <input id="email" name="email" type="email" placeholder="alguien@ucc.edu.ar" required autoFocus />
          </label>
          <label htmlFor="contrasena">
            Contraseña
            <input id="contrasena" name="contrasena" type="password" required />
          </label>
          <Boton enCurso="Ingresando">Ingresar</Boton>
          <p className="nota-ingreso">
            Si todavía no tenés contraseña, pedísela al equipo SIED
            (tecnologia.sied@ucc.edu.ar) desde Administración.
          </p>
        </form>
      )}
    </main>
  )
}
