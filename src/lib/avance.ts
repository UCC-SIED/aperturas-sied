import { ESTADOS, type Estado } from './estados'
import { estaCubierto, lugaresDelPlan, type AsignaturaParaConteo } from './seminarios'

export type Avance = {
  total: number
  finalizadas: number
  porcentaje: number
  porEstado: Record<Estado, number>
}

/**
 * Cuánto del plan está terminado. Equivale al panel de control de la planilla.
 *
 * Cuenta **lugares del plan**, no códigos: un seminario con tres variantes
 * optativas es un solo lugar. Si contara códigos, el total crecería cada vez
 * que se arma un seminario optativo y el porcentaje caería sin que nadie
 * hubiera dejado de trabajar.
 */
export function resumirAvance(asignaturas: AsignaturaParaConteo[]): Avance {
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>
  const lugares = lugaresDelPlan(asignaturas)

  for (const lugar of lugares) {
    // Un lugar cubierto cuenta como terminado aunque el código del plan siga
    // sin novedad: lo que lo cubre son sus variantes. Si no está cubierto se
    // muestra el estado del propio lugar — el detalle de cada variante se ve
    // en el seguimiento de producción, que es donde se trabaja.
    const estado = estaCubierto(lugar) ? 'finalizacion' : lugar.estado
    if (estado in porEstado) porEstado[estado as Estado]++
  }

  const total = lugares.length
  const finalizadas = porEstado.finalizacion
  return {
    total,
    finalizadas,
    porcentaje: total ? Math.round((finalizadas / total) * 100) : 0,
    porEstado,
  }
}
