import { describe, it, expect } from 'vitest'
import { estaCubierto, lugaresDelPlan, type LugarDelPlan } from '@/lib/seminarios'

/** Un lugar del plan armado a mano, con el estado y las variantes que haga falta. */
function lugar(
  estado: string,
  variantes: string[] = [],
  variantesRequeridas = 1,
): LugarDelPlan {
  return {
    codigo: 'EP00500',
    estado,
    variantesRequeridas,
    variantes: variantes.map((e, i) => ({ codigo: `EP0050${i + 1}`, estado: e })),
  }
}

describe('cuándo un lugar del plan está cubierto', () => {
  it('sin variantes, cuenta su propio estado', () => {
    expect(estaCubierto(lugar('finalizacion'))).toBe(true)
    expect(estaCubierto(lugar('maquetacion'))).toBe(false)
  })

  it('con una variante requerida, alcanza con que esa esté finalizada', () => {
    expect(estaCubierto(lugar('sin_novedad', ['finalizacion'], 1))).toBe(true)
    expect(estaCubierto(lugar('sin_novedad', ['maquetacion'], 1))).toBe(false)
  })

  it('con tres requeridas, dos finalizadas no alcanzan', () => {
    const dos = ['finalizacion', 'finalizacion', 'maquetacion']
    expect(estaCubierto(lugar('sin_novedad', dos, 3))).toBe(false)
  })

  it('con tres requeridas y tres finalizadas, está cubierto', () => {
    const tres = ['finalizacion', 'finalizacion', 'finalizacion']
    expect(estaCubierto(lugar('sin_novedad', tres, 3))).toBe(true)
  })

  // El caso "a veces el seminario se dicta tal cual figura en el plan".
  it('el principal finalizado cubre el lugar aunque ninguna variante lo esté', () => {
    const ninguna = ['sin_novedad', 'construccion']
    expect(estaCubierto(lugar('finalizacion', ninguna, 3))).toBe(true)
  })

  it('sobran variantes finalizadas: sigue cubierto', () => {
    const cuatro = ['finalizacion', 'finalizacion', 'finalizacion', 'finalizacion']
    expect(estaCubierto(lugar('sin_novedad', cuatro, 3))).toBe(true)
  })
})

describe('qué cuenta como lugar del plan', () => {
  // Las variantes no son lugares del plan: si contaran, el total del panel
  // crecería cada vez que se arma un seminario optativo.
  it('deja afuera las asignaturas que son variantes de otra', () => {
    const asignaturas = [
      { codigo: 'A', estado: 'finalizacion', principalCodigo: null, variantesRequeridas: 1 },
      { codigo: 'B', estado: 'sin_novedad', principalCodigo: null, variantesRequeridas: 3 },
      { codigo: 'B1', estado: 'finalizacion', principalCodigo: 'B', variantesRequeridas: 1 },
      { codigo: 'B2', estado: 'finalizacion', principalCodigo: 'B', variantesRequeridas: 1 },
    ]
    const lugares = lugaresDelPlan(asignaturas)

    expect(lugares.map((l) => l.codigo)).toEqual(['A', 'B'])
    expect(lugares.find((l) => l.codigo === 'B')?.variantes).toHaveLength(2)
  })

  it('arma bien el lugar aunque las variantes vengan antes que su principal', () => {
    const asignaturas = [
      { codigo: 'B1', estado: 'finalizacion', principalCodigo: 'B', variantesRequeridas: 1 },
      { codigo: 'B', estado: 'sin_novedad', principalCodigo: null, variantesRequeridas: 1 },
    ]
    const lugares = lugaresDelPlan(asignaturas)

    expect(lugares).toHaveLength(1)
    expect(estaCubierto(lugares[0])).toBe(true)
  })

  // Una variante cuyo principal no vino en la lista no puede desaparecer del
  // conteo: sería producción real que nadie ve.
  it('una variante huérfana cuenta como lugar propio', () => {
    const asignaturas = [
      { codigo: 'X1', estado: 'finalizacion', principalCodigo: 'NO_ESTA', variantesRequeridas: 1 },
    ]
    const lugares = lugaresDelPlan(asignaturas)

    expect(lugares.map((l) => l.codigo)).toEqual(['X1'])
  })
})
