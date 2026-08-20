import Link from 'next/link'
import { IconoCandado, IconoAlerta } from '@/components/iconos'
import { FormRecuperar } from './FormRecuperar'

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
            <FormRecuperar />
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
