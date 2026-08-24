import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'
import { IconoCandado } from '@/components/iconos'
import { FormElegir } from './FormElegir'

export const metadata = { title: 'Elegí tu contraseña' }

export const dynamic = 'force-dynamic'

export default async function ElegirContrasena() {
  // sesionActual() y no exigirSesion(): esta es la pantalla a la que
  // exigirSesion redirige, así que usarla acá sería un bucle.
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (!s.debeElegirContrasena) redirect('/')

  return (
    <main className="pantalla-ingreso">
      <div className="tarjeta-ingreso">
        <div className="marca-ingreso">
          <span className="sello-ingreso" aria-hidden>
            <IconoCandado />
          </span>
          <div>
            <p className="eyebrow">SIED · Universidad Católica de Córdoba</p>
            <h1>Elegí tu contraseña</h1>
          </div>
        </div>

        <p className="bajada-ingreso">
          Hola {s.nombre}. La contraseña con la que entraste la generó el sistema y la
          conoce el equipo SIED, así que sirve una sola vez. Elegí una propia: va a ser la
          única que funcione de acá en adelante, y nadie más la va a saber.
        </p>

        <FormElegir />
      </div>
    </main>
  )
}
