import Link from 'next/link'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/tokens'
import { IconoCandado, IconoAlerta } from '@/components/iconos'
import { FormRestablecer } from './FormRestablecer'

export const metadata = { title: 'Elegir contraseña nueva' }

export const dynamic = 'force-dynamic'

export default async function RecuperarConToken({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const reinicio = await prisma.reinicioContrasena.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  const valido = reinicio && !reinicio.usado && reinicio.expira > new Date()

  return (
    <main className="pantalla-ingreso">
      <div className="tarjeta-ingreso">
        <div className="marca-ingreso">
          <span className="sello-ingreso" aria-hidden>
            <IconoCandado />
          </span>
          <div>
            <p className="eyebrow">SIED · Universidad Católica de Córdoba</p>
            <h1>Elegir contraseña nueva</h1>
          </div>
        </div>

        {!valido ? (
          <>
            <p className="mensaje-error" role="alert">
              <IconoAlerta />
              <span>Este link ya se usó o venció. Pedí uno nuevo.</span>
            </p>
            <p className="nota-ingreso">
              <Link href="/recuperar">Pedir un link nuevo</Link>
            </p>
          </>
        ) : (
          <FormRestablecer token={token} />
        )}
      </div>
    </main>
  )
}
