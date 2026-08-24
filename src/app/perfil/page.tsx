import { exigirSesion } from '@/lib/sesion'
import { ROL_LABELS } from '@/lib/permisos'
import { FormPerfil } from './FormPerfil'

export const metadata = { title: 'Mi cuenta' }

export const dynamic = 'force-dynamic'

export default async function Perfil() {
  const s = await exigirSesion()

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>Mi cuenta</h1>
          <p className="sub">
            {s.nombre} · {s.email} · {ROL_LABELS[s.rol] ?? s.rol}
          </p>
        </div>
      </div>

      <h2>Cambiar mi contraseña</h2>
      <p className="ayuda">
        Nadie más que vos la va a saber. Si te la olvidás, se pide una nueva desde
        &ldquo;¿Olvidaste tu contraseña?&rdquo; en la pantalla de ingreso.
      </p>
      <FormPerfil />
    </main>
  )
}
