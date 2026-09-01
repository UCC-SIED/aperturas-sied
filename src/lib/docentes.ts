import type { PrismaClient } from '@prisma/client'

/**
 * Separa un texto libre de docentes ("Ana Paz / Juan Ruiz" o un solo
 * nombre) en nombres individuales, sin vacíos ni duplicados.
 *
 * Sólo "/" separa personas. La coma NO separa: en los datos de origen se
 * usa para el formato "Apellido, Nombre" de una sola persona (ej. "Sánchez,
 * Gabriel Leandro") — partir por coma la convertía en dos docentes falsos.
 */
export function parseDocentes(texto: string): string[] {
  const vistos = new Set<string>()
  const nombres: string[] = []
  for (const n of texto.split('/').map((s) => s.trim()).filter(Boolean)) {
    if (!vistos.has(n)) {
      vistos.add(n)
      nombres.push(n)
    }
  }
  return nombres
}

/** Para mostrar una lista de docentes como un solo texto legible. */
export function joinDocentes(nombres: string[]): string {
  return nombres.join(' / ')
}

/**
 * Si dos listas de docentes son el mismo grupo de personas, sin importar el
 * orden. La usan las validaciones de Unidad Académica para saber si hay que
 * apagarlas: lo que se había aprobado era ese grupo puntual.
 */
export function mismoGrupoDeDocentes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const ordenadosA = [...a].sort()
  const ordenadosB = [...b].sort()
  return ordenadosA.every((nombre, i) => nombre === ordenadosB[i])
}

/**
 * La clave real para saber si dos nombres son "la misma persona": sin
 * espacios de sobra ni diferencia de mayúsculas. Se compara así (no con un
 * filtro insensible a mayúsculas de la base) porque eso sólo lo soporta
 * PostgreSQL, y local/tests corren sobre SQLite.
 */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Da de alta en el catálogo (si hace falta) y devuelve los ids de Docente
 * para esta lista de nombres, en el mismo orden. Es el único lugar que
 * decide "esto es la misma persona que ya existe" — todo lo que carga un
 * docente tutor o contenidista pasa por acá antes de guardar la relación.
 */
export async function resolverDocentes(prisma: PrismaClient, nombres: string[]): Promise<number[]> {
  const ids: number[] = []
  for (const nombre of nombres) {
    const docente = await prisma.docente.upsert({
      where: { claveNormalizada: normalizarNombre(nombre) },
      update: {},
      create: { nombre, claveNormalizada: normalizarNombre(nombre) },
    })
    ids.push(docente.id)
  }
  return ids
}
