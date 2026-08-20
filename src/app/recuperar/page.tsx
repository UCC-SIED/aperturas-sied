import Link from 'next/link'
import { Boton } from '@/components/Boton'
import { IconoCandado, IconoAlerta } from '@/components/iconos'
import { solicitarRecuperacion } from './actions'

export const metadata = { title: 'Recuperar contraseña' }

export const dynamic = 'force-dynamic'

export default async function Recuperar({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; vencido?: string }>
}) {
  const { enviado, vencido } = await searchParams

  return (
    <main className="pantalla-ingreso">
      <div className="tarjeta-ingreso">
        <div className="marca-ingreso">
          <span className="sello-ingreso" aria-hidden>
            <IconoCandado />
          </span>
          <div>
            <p className="eyebrow">SIED · Universidad Católica de Córdoba</p>
            <h1>Recuperar contraseña</h1>
          </div>
        </div>

        {enviado ? (
          <>
            <p className="bajada-ingreso">
              Si ese correo está dado de alta en el sistema, te llegó un mail con un link para
              elegir una contraseña nueva. Vale por 2 horas.
            </p>
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        ) : (
          <>
            {vencido && (
              <p className="mensaje-error" role="alert">
                <IconoAlerta />
                <span>Ese link ya se usó o venció. Pedí uno nuevo.</span>
              </p>
            )}
            <p className="bajada-ingreso">
              Ingresá tu correo institucional y te mandamos un link para elegir una contraseña
              nueva.
            </p>
            <form action={solicitarRecuperacion} className="form-ingreso">
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
              <Boton className="boton-principal" enCurso="Enviando">Mandar link</Boton>
            </form>
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
