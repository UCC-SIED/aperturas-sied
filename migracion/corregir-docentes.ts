/**
 * Corrige un bug ya arreglado en parseDocentes: separaba por coma además
 * de por barra, y el tablero trae varios docentes en formato "Apellido,
 * Nombre" (una sola persona) — eso quedó guardado como dos docentes falsos.
 *
 * Esta lista es la exacta (verificada contra migracion/planes-posgrado.ts,
 * que nunca tuvo el bug): son los únicos códigos cuyo texto de origen tiene
 * una coma de formato "Apellido, Nombre", no una lista de personas.
 *
 * No recalcula desde la fuente estática (podría pisar ediciones manuales
 * hechas después en el sistema, como pasó al probarlo con EP00461): sólo
 * junta de nuevo los dos primeros fragmentos ya guardados para este código
 * puntual, que es exactamente lo que el bug separó de más.
 *
 * Uso: npx tsx migracion/corregir-docentes.ts
 */
import { prisma } from '../src/lib/db'

const CODIGOS_AFECTADOS = [
  'EP01396', 'EP00971', 'EP00582', 'EP00436',
  'EP01740', 'EP00121', 'EP01849', 'EP00504',
]

async function main() {
  let corregidos = 0
  for (const codigo of CODIGOS_AFECTADOS) {
    const actuales = await prisma.asignaturaDocente.findMany({
      where: { asignaturaCodigo: codigo },
      orderBy: { orden: 'asc' },
    })
    if (actuales.length < 2) {
      console.log(`${codigo}: sólo ${actuales.length} registro(s), no hay nada que juntar — se salta`)
      continue
    }

    const [primero, segundo, ...resto] = actuales
    const nombreJunto = `${primero.nombre}, ${segundo.nombre}`

    await prisma.asignaturaDocente.deleteMany({ where: { asignaturaCodigo: codigo } })
    await prisma.asignaturaDocente.create({ data: { asignaturaCodigo: codigo, nombre: nombreJunto, orden: 0 } })
    for (const [i, r] of resto.entries()) {
      await prisma.asignaturaDocente.create({ data: { asignaturaCodigo: codigo, nombre: r.nombre, orden: i + 1 } })
    }

    console.log(`${codigo}: [${actuales.map((a) => a.nombre).join(' / ')}] -> [${[nombreJunto, ...resto.map((r) => r.nombre)].join(' / ')}]`)
    corregidos++
  }

  console.log(`\n${corregidos} de ${CODIGOS_AFECTADOS.length} códigos corregidos.`)
  await prisma.$disconnect()
}

main()
