import Link from 'next/link'
import { IconoCandado } from '@/components/iconos'
import { FormRecuperar } from './FormRecuperar'

export const metadata = { title: 'Recuperar contraseña' }

export const dynamic = 'force-dynamic'

export default async function Recuperar({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>
}) {
  const { enviado } = await searchParams

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
              Listo. Si ese correo está dado de alta, el equipo SIED ya tiene tu pedido y se
              va a poner en contacto para darte una contraseña nueva.
            </p>
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        ) : (
          <>
            <p className="bajada-ingreso">
              Ingresá tu correo institucional y le avisamos al equipo SIED, que te va a
              cargar una contraseña nueva y te la va a pasar.
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
