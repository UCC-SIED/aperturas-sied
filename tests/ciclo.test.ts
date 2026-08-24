import { describe, it, expect } from 'vitest'
import { cicloPosgrado, cicloEducacion, cicloDelPeriodo } from '@/lib/ciclo'

/** aaaa-mm-dd, para leer los casos de un vistazo. */
const d = (iso: string) => {
  const [a, m, dia] = iso.split('-').map(Number)
  return new Date(a, m - 1, dia)
}
const iso = (fecha: Date | null) => {
  if (!fecha) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
}

describe('la inscripción, que es igual en las dos unidades', () => {
  it('abre diez días antes del cursado y cierra tres días antes', () => {
    const p = cicloPosgrado(d('2027-03-03'))
    expect(iso(p.aperturaInscripcion)).toBe('2027-02-21')
    expect(iso(p.cierreInscripcion)).toBe('2027-02-28')

    const e = cicloEducacion(d('2027-03-03'))
    expect(iso(e.aperturaInscripcion)).toBe('2027-02-21')
    expect(iso(e.cierreInscripcion)).toBe('2027-02-28')
  })

  // Los dos días libres son para terminar de configurar el aula.
  it('deja dos días libres entre el cierre y el inicio del cursado', () => {
    const c = cicloEducacion(d('2027-03-03'))
    const dias = Math.round((+d('2027-03-03') - +c.cierreInscripcion!) / 86400000) - 1
    expect(dias).toBe(2)
  })
})

describe('ciclo de un período mensual de Posgrado', () => {
  const c = cicloPosgrado(d('2027-03-03'))

  it('el límite de entregas es al mes de empezar', () => {
    expect(iso(c.finCursado)).toBe('2027-04-03')
  })

  it('el AFI abre al día siguiente del límite de entregas', () => {
    expect(iso(c.aperturaAfi)).toBe('2027-04-04')
  })

  it('el AFI vence a los veinte días de abrir', () => {
    expect(iso(c.cierreAfi)).toBe('2027-04-24')
  })

  it('el aula cierra a los dos meses de empezar el cursado', () => {
    expect(iso(c.cierreAsignatura)).toBe('2027-05-03')
  })

  it('el AFI vence antes de que cierre el aula, con margen para reentregas', () => {
    const dias = Math.round((+c.cierreAsignatura! - +c.cierreAfi!) / 86400000)
    expect(dias).toBeGreaterThanOrEqual(7)
    expect(dias).toBeLessThanOrEqual(12)
  })

  it('las fechas quedan en orden cronológico', () => {
    const orden = [
      c.aperturaInscripcion, c.cierreInscripcion, d('2027-03-03'),
      c.finCursado, c.aperturaAfi, c.cierreAfi, c.cierreAsignatura,
    ]
    for (let i = 1; i < orden.length; i++) {
      expect(+orden[i]!).toBeGreaterThan(+orden[i - 1]!)
    }
  })

  // Sumar un mes a un 31 no puede caer en un día que no existe.
  it('un 31 no se desborda al mes siguiente', () => {
    const enero = cicloPosgrado(d('2027-01-31'))
    expect(iso(enero.finCursado)).toBe('2027-02-28')
    expect(iso(enero.cierreAsignatura)).toBe('2027-03-31')
  })

  it('cruza bien el fin de año', () => {
    const nov = cicloPosgrado(d('2027-11-03'))
    expect(iso(nov.finCursado)).toBe('2027-12-03')
    expect(iso(nov.cierreAsignatura)).toBe('2028-01-03')
  })
})

/**
 * Los seis períodos reales del calendario 2026 de Educación, tomados de la
 * planilla. En Educación el orden va al revés que en Posgrado: primero vence
 * el AFI y recién dos días después cierran las entregas.
 */
describe('ciclo de Educación, contra el calendario real de 2026', () => {
  const reales = [
    { nombre: 'Bimestre A', inicio: '2026-03-04', afi: '2026-04-09', vence: '2026-04-23', entregas: '2026-04-25', cierre: '2026-04-29' },
    { nombre: 'Bimestre B', inicio: '2026-05-13', afi: '2026-06-11', vence: '2026-06-25', entregas: '2026-06-27', cierre: '2026-07-01' },
    { nombre: 'Bimestre C', inicio: '2026-08-12', afi: '2026-09-17', vence: '2026-10-01', entregas: '2026-10-03', cierre: '2026-10-07' },
    { nombre: 'Bimestre D', inicio: '2026-10-21', afi: '2026-11-19', vence: '2026-12-03', entregas: '2026-12-05', cierre: '2026-12-09' },
    { nombre: 'Cuatrimestral A', inicio: '2026-03-04', afi: '2026-05-28', vence: '2026-06-11', entregas: '2026-06-13', cierre: '2026-06-17' },
    { nombre: 'Cuatrimestral C', inicio: '2026-08-12', afi: '2026-11-05', vence: '2026-11-19', entregas: '2026-11-21', cierre: '2026-11-25' },
  ]

  for (const r of reales) {
    it(`reproduce las fechas de ${r.nombre}`, () => {
      const c = cicloEducacion(d(r.inicio), d(r.afi))
      expect(iso(c.aperturaAfi)).toBe(r.afi)
      expect(iso(c.cierreAfi)).toBe(r.vence)
      expect(iso(c.finCursado)).toBe(r.entregas)
      expect(iso(c.cierreAsignatura)).toBe(r.cierre)
    })
  }

  it('sin la apertura del AFI, deja vacía toda la segunda mitad', () => {
    const c = cicloEducacion(d('2026-03-04'))
    expect(c.aperturaAfi).toBeNull()
    expect(c.cierreAfi).toBeNull()
    expect(c.finCursado).toBeNull()
    expect(c.cierreAsignatura).toBeNull()
    // La primera mitad no depende del AFI, así que se calcula igual.
    expect(iso(c.aperturaInscripcion)).toBe('2026-02-22')
  })
})

describe('elegir el ciclo según el tipo de período', () => {
  it('un mensual usa las reglas de Posgrado', () => {
    const c = cicloDelPeriodo('mensual', d('2027-03-03'))
    expect(iso(c!.finCursado)).toBe('2027-04-03')
  })

  it('un bimestral usa las de Educación', () => {
    const c = cicloDelPeriodo('bimestral', d('2026-03-04'), d('2026-04-09'))
    expect(iso(c!.cierreAsignatura)).toBe('2026-04-29')
  })

  // Doce semanas más un día: es lo que dan los dos cuatrimestrales de 2026.
  it('un cuatrimestral propone la apertura del AFI a las doce semanas', () => {
    const c = cicloDelPeriodo('cuatrimestral', d('2026-03-04'))
    expect(iso(c!.aperturaAfi)).toBe('2026-05-28')
    expect(iso(c!.cierreAsignatura)).toBe('2026-06-17')
  })

  // Un bimestral no propone nada: A y C duran cinco semanas y B y D cuatro, y
  // el sistema no sabe cuál es cuál — sólo guarda el tipo.
  it('un bimestral no inventa la apertura del AFI', () => {
    const c = cicloDelPeriodo('bimestral', d('2026-03-04'))
    expect(c!.aperturaAfi).toBeNull()
  })

  it('un tipo que no conoce no devuelve nada', () => {
    expect(cicloDelPeriodo('otra_cosa', d('2027-03-03'))).toBeNull()
  })
})
