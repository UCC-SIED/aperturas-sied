import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { esCorreoInstitucional } from '@/lib/permisos'

/**
 * Ingreso con la cuenta institucional de Google.
 *
 * Dos puertas: el correo tiene que ser del dominio de la universidad, y además
 * la persona tiene que estar dada de alta en el sistema. Tener una cuenta
 * @ucc.edu.ar no alcanza para entrar; alguien de administración tiene que
 * habilitarla y darle un rol.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // La pantalla de Google ya filtra por dominio, pero igual se valida abajo
      authorization: { params: { hd: 'ucc.edu.ar', prompt: 'select_account' } },
    }),
  ],
  pages: {
    signIn: '/ingresar',
    error: '/ingresar',
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase()
      if (!esCorreoInstitucional(email)) return '/ingresar?error=dominio'

      const usuario = await prisma.usuario.findUnique({ where: { email: email! } })
      if (!usuario) return '/ingresar?error=sin-alta'
      if (!usuario.activo) return '/ingresar?error=inactivo'

      // El nombre de Google mantiene actualizado el que se ve en el historial
      if (profile?.name && profile.name !== usuario.nombre) {
        await prisma.usuario.update({ where: { email: email! }, data: { nombre: profile.name } })
      }
      return true
    },
    async jwt({ token }) {
      // El rol y las carreras se leen de la base, no del token: un cambio de
      // permisos tiene efecto en el próximo pedido, sin volver a iniciar sesión.
      return token
    },
    async session({ session }) {
      return session
    },
  },
  session: { strategy: 'jwt' },
  trustHost: true,
})
