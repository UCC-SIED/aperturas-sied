import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))
vi.mock('@/lib/sesion', () => ({ iniciarSesion: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn().mockRejectedValue(new Error("Can't reach database server")),
    },
  },
}))

import { entrarConCredenciales } from '@/app/ingresar/actions'

describe('entrarConCredenciales con la base caída', () => {
  it('avisa que el servicio no responde en vez de romper la pantalla', async () => {
    const f = new FormData()
    f.set('email', 'alguien@ucc.edu.ar')
    f.set('contrasena', 'lo-que-sea')
    await expect(entrarConCredenciales(f)).rejects.toThrow('REDIRECT:/ingresar?error=servicio')
  })
})
