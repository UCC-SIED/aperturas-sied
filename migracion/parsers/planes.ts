import * as XLSX from 'xlsx'

export type FilaPlanEstudios = {
  unidad: 'posgrado' | 'educacion'
  carrera: string
  codigo: string | null
  nombre: string
  orden: number
}

function celda(fila: Record<string, unknown>, ...nombres: string[]): string {
  for (const k of Object.keys(fila)) {
    const kn = k.trim().toUpperCase()
    if (nombres.some((n) => kn === n.toUpperCase() || kn.startsWith(n.toUpperCase()))) {
      return String(fila[k] ?? '').trim()
    }
  }
  return ''
}

/** Los códigos de Educación son numéricos (1210131); los de Posgrado empiezan con letra (EP01898). */
function unidadPorCodigo(codigo: string): 'posgrado' | 'educacion' {
  return /^\d/.test(codigo) ? 'educacion' : 'posgrado'
}

/**
 * Lee planes de estudio de un xlsx. Tolera las formas en que suelen venir:
 * una hoja con todo y columna CARRERA, o una hoja por carrera con el nombre
 * en la pestaña; con columna ORDEN o numerando por posición.
 */
export function parsePlanes(buffer: Buffer): FilaPlanEstudios[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const filas: FilaPlanEstudios[] = []
  const contador = new Map<string, number>()

  for (const nombreHoja of wb.SheetNames) {
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nombreHoja], { defval: '' })
    const esDePlan = json.some((f) =>
      Object.keys(f).some((k) => k.trim().toUpperCase().startsWith('ASIGNATURA')),
    )
    if (!esDePlan) continue

    for (const fila of json) {
      const nombre = celda(fila, 'ASIGNATURA', 'MATERIA')
      if (!nombre) continue

      const carrera = celda(fila, 'CARRERA', 'PROGRAMA', 'PLAN') || nombreHoja.trim()
      const codigo = celda(fila, 'CÓDIGO', 'CODIGO') || null
      const unidadCelda = celda(fila, 'UNIDAD').toLowerCase()
      const unidad = unidadCelda.startsWith('educ')
        ? 'educacion'
        : unidadCelda.startsWith('posg')
          ? 'posgrado'
          : unidadPorCodigo(codigo ?? '')

      const ordenCelda = celda(fila, 'ORDEN', 'N°', 'NRO', 'NÚMERO', 'NUMERO')
      const siguiente = (contador.get(carrera) ?? 0) + 1
      contador.set(carrera, siguiente)

      filas.push({
        unidad,
        carrera,
        codigo,
        nombre,
        orden: Number(ordenCelda) || siguiente,
      })
    }
  }
  return filas
}
