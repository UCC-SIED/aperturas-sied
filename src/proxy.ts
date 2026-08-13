import { NextResponse, type NextRequest } from 'next/server'

export default function proxy(req: NextRequest) {
  const user = process.env.ACCESO_USUARIO
  const pass = process.env.ACCESO_CLAVE
  // Sin credenciales configuradas (desarrollo local) no bloquea.
  if (!user || !pass) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const [u, p] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
    if (u === user && p === pass) return NextResponse.next()
  }
  return new NextResponse('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Gestión SIED"' },
  })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
