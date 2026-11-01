import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { GET } from '@/app/api/keepalive/route'

function pedido(token?: string) {
  return new Request('http://localhost/api/keepalive', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

describe('GET /api/keepalive', () => {
  afterEach(() => { delete process.env.CRON_SECRET })
  afterAll(() => prisma.$disconnect())

  it('sin CRON_SECRET configurado responde ok tras tocar la base', async () => {
    const res = await GET(pedido())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('con CRON_SECRET rechaza un pedido sin el token correcto', async () => {
    process.env.CRON_SECRET = 'secreto-de-prueba'
    expect((await GET(pedido())).status).toBe(401)
    expect((await GET(pedido('otro'))).status).toBe(401)
  })

  it('con CRON_SECRET acepta el token correcto', async () => {
    process.env.CRON_SECRET = 'secreto-de-prueba'
    expect((await GET(pedido('secreto-de-prueba'))).status).toBe(200)
  })
})
