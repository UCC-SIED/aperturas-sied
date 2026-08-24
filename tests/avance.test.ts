import { describe, it, expect } from 'vitest'
import { resumirAvance } from '@/lib/avance'

/** Asignaturas comunes: ninguna es variante de otra. */
const asigs = (estados: string[]) =>
  estados.map((estado, i) => ({
    codigo: `C${i}`,
    estado,
    principalCodigo: null,
    variantesRequeridas: 1,
  }))

describe('resumirAvance', () => {
  it('cuenta por etapa y calcula el porcentaje de finalizadas', () => {
    const r = resumirAvance(asigs(['finalizacion', 'finalizacion', 'maquetacion', 'construccion']))
    expect(r.total).toBe(4)
    expect(r.finalizadas).toBe(2)
    expect(r.porcentaje).toBe(50)
    expect(r.porEstado.maquetacion).toBe(1)
    expect(r.porEstado.construccion).toBe(1)
  })

  it('redondea al entero más cercano', () => {
    expect(resumirAvance(asigs(['finalizacion', 'construccion', 'construccion'])).porcentaje).toBe(33)
    expect(resumirAvance(asigs(['finalizacion', 'finalizacion', 'construccion'])).porcentaje).toBe(67)
  })

  it('sin asignaturas no divide por cero', () => {
    const r = resumirAvance([])
    expect(r.total).toBe(0)
    expect(r.porcentaje).toBe(0)
  })

  it('todas terminadas es 100', () => {
    expect(resumirAvance(asigs(['finalizacion', 'finalizacion'])).porcentaje).toBe(100)
  })

  it('incluye las ocho etapas aunque estén en cero', () => {
    const r = resumirAvance(asigs(['finalizacion']))
    expect(Object.keys(r.porEstado)).toHaveLength(8)
    expect(r.porEstado.sin_novedad).toBe(0)
  })
})
