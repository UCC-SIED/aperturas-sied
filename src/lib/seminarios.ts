/**
 * Algunas carreras tienen en su plan un lugar del tipo "Seminario". Para
 * cubrirlo se arman seminarios optativos concretos, cada uno con su código, su
 * docente y su aula: a veces dos, a veces tres. Cuántos hacen falta se decide
 * caso por caso según la carga horaria, y por eso vive en un número guardado
 * en el seminario del plan.
 *
 * Acá está la única cuenta que importa: qué es un lugar del plan y cuándo se
 * puede dar por cubierto. Está separado de las pantallas para poder probarlo
 * sin navegador.
 */

const FINALIZADA = 'finalizacion'

/** Lo mínimo que hace falta saber de una asignatura para armar el conteo. */
export type AsignaturaParaConteo = {
  codigo: string
  estado: string
  principalCodigo: string | null
  variantesRequeridas: number
}

export type LugarDelPlan = {
  codigo: string
  estado: string
  variantesRequeridas: number
  variantes: { codigo: string; estado: string }[]
}

/**
 * Un lugar del plan está cubierto si el seminario se produjo tal cual figura
 * en el plan, **o** si se produjeron suficientes variantes. El "o" es lo que
 * sostiene el caso de que a veces el seminario se dicta sin desdoblarse.
 */
export function estaCubierto(lugar: LugarDelPlan): boolean {
  if (lugar.estado === FINALIZADA) return true
  if (!lugar.variantes.length) return false

  const listas = lugar.variantes.filter((v) => v.estado === FINALIZADA).length
  return listas >= lugar.variantesRequeridas
}

/**
 * Agrupa una lista de asignaturas en lugares del plan: las variantes se
 * pliegan bajo su principal en vez de contar aparte. Si contaran, el total del
 * panel crecería cada vez que se arma un seminario optativo, y el porcentaje
 * de avance caería sin que nadie hubiera dejado de trabajar.
 */
export function lugaresDelPlan(asignaturas: AsignaturaParaConteo[]): LugarDelPlan[] {
  const porCodigo = new Map(asignaturas.map((a) => [a.codigo, a]))

  // Una variante cuyo principal no está en la lista se cuenta como lugar
  // propio: es producción real y no puede desaparecer del tablero.
  const esVariante = (a: AsignaturaParaConteo) =>
    a.principalCodigo !== null && porCodigo.has(a.principalCodigo)

  const lugares = asignaturas
    .filter((a) => !esVariante(a))
    .map<LugarDelPlan>((a) => ({
      codigo: a.codigo,
      estado: a.estado,
      variantesRequeridas: a.variantesRequeridas,
      variantes: [],
    }))

  const porLugar = new Map(lugares.map((l) => [l.codigo, l]))
  for (const a of asignaturas) {
    if (!esVariante(a)) continue
    porLugar.get(a.principalCodigo!)?.variantes.push({ codigo: a.codigo, estado: a.estado })
  }

  return lugares
}
