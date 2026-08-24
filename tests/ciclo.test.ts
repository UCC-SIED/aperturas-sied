import { describe, it, expect } from 'vitest'
import { cicloPosgrado } from '@/lib/ciclo'

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

describe('ciclo de un período mensual de Posgrado', () => {
  const c = cicloPosgrado(d('2027-03-03'))

  it('la inscripción abre diez días antes del cursado', () => {
    expect(iso(c.aperturaInscripcion)).toBe('2027-02-21')
  })

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

  it('la inscripción cierra a los siete días de abrir', () => {
    expect(iso(c.cierreInscripcion)).toBe('2027-02-28')
  })

  // Los dos días son para terminar de configurar el aula antes de que entren.
  it('deja dos días libres entre el cierre de inscripción y el inicio del cursado', () => {
    const dias = Math.round((+d('2027-03-03') - +c.cierreInscripcion!) / 86400000) - 1
    expect(dias).toBe(2)
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
