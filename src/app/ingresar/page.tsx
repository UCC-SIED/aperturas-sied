import { googleActivo } from '@/lib/sesion'
import { signIn } from '@/auth'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoGoogle, IconoAlerta, IconoCandado } from '@/components/iconos'
import { entrarConCredenciales } from './actions'

export const metadata = { title: 'Ingresar' }

export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  dominio: 'Esa cuenta no es de la universidad. Entrá con tu correo @ucc.edu.ar.',
  'sin-alta': 'Tu cuenta todavía no está habilitada en el sistema. Escribile a tecnologia.sied@ucc.edu.ar para que te den de alta.',
  inactivo: 'Tu acceso está dado de baja. Si creés que es un error, escribile a tecnologia.sied@ucc.edu.ar.',
  credenciales: 'Correo o contraseña incorrectos. Revisá que el correo sea el institucional y que no tengas activado Bloq Mayús.',
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
    <main className="pantalla-ingreso">
      <div className="tarjeta-ingreso">
        <div className="marca-ingreso">
          <span className="sello-ingreso" aria-hidden>
            <IconoCandado />
          </span>
          <div>
            <p className="eyebrow">SIED · Universidad Católica de Córdoba</p>
            <h1>Gestión de Asignaturas</h1>
          </div>
        </div>

        <p className="bajada-ingreso">
          Aperturas de aulas y seguimiento de producción en Canvas.
        </p>

        {error && (
          <p className="mensaje-error" role="alert">
            <IconoAlerta />
            <span>{MENSAJES[error] ?? MENSAJES.AccessDenied}</span>
          </p>
        )}

        {conGoogle ? (
          <form action={entrarConGoogle} className="form-ingreso">
            <Boton className="boton-google" enCurso="Conectando con Google">
              <IconoGoogle />
              Entrar con mi cuenta institucional
            </Boton>
          </form>
        ) : (
          <form action={entrarConCredenciales} className="form-ingreso">
            <div className="campo">
              <label htmlFor="email">Correo institucional</label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="alguien@ucc.edu.ar"
                spellCheck={false}
                required
                autoFocus
              />
            </div>
            <CampoContrasena />
            <Boton className="boton-principal" enCurso="Ingresando">Ingresar</Boton>
          </form>
        )}

        <p className="nota-ingreso">
          {conGoogle ? (
            <>
              Se ingresa con la cuenta <strong>@ucc.edu.ar</strong>. Si la tuya todavía no está
              habilitada, pedila a{' '}
              <a href="mailto:tecnologia.sied@ucc.edu.ar">tecnologia.sied@ucc.edu.ar</a>.
            </>
          ) : (
            <>
              ¿Todavía no tenés contraseña? Pedísela al equipo SIED a{' '}
              <a href="mailto:tecnologia.sied@ucc.edu.ar">tecnologia.sied@ucc.edu.ar</a>.
            </>
          )}
        </p>
      </div>
    </main>
  )
}
