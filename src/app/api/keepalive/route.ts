import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Lo llama a diario el cron de Vercel (vercel.json). Supabase, en el plan
 * gratuito, pausa el proyecto tras una semana sin actividad y el sistema
 * entero deja de andar hasta que alguien lo reactive a mano: una consulta
 * por día alcanza para que cuente como actividad.
 *
 * Si CRON_SECRET está definido en Vercel, el cron lo manda como Bearer y acá
 * se exige; sin él el endpoint igual es inocuo (sólo hace SELECT 1).
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET
  if (secreto && req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return Response.json({ ok: false }, { status: 401 })
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
