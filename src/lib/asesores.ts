import type { PrismaClient } from '@prisma/client'
import { normalizarNombre } from './docentes'

/**
 * Da de alta en el catálogo (si hace falta) y devuelve el id de Asesor para
 * este nombre, o null si vino vacío. Es el único lugar que decide "esto es
 * la misma persona que ya existe" para asesores — mismo mecanismo que
 * resolverDocentes, pero para un solo nombre en vez de una lista.
 */
export async function resolverAsesor(prisma: PrismaClient, nombre: string | null): Promise<number | null> {
  const limpio = nombre?.trim()
  if (!limpio) return null
  const asesor = await prisma.asesor.upsert({
    where: { claveNormalizada: normalizarNombre(limpio) },
    update: {},
    create: { nombre: limpio, claveNormalizada: normalizarNombre(limpio) },
  })
  return asesor.id
}
