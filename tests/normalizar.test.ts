import { describe, it, expect } from 'vitest'
import { mapEstado, parseFecha } from '@/lib/normalizar'

describe('mapEstado', () => {
  it('mapea los estados de las planillas', () => {
    expect(mapEstado('5.FINALIZADA')).toBe('finalizacion')
    expect(mapEstado('5. (OM) FINALIZADA')).toBe('finalizacion')
    expect(mapEstado('3.MAQUETACIÓN')).toBe('maquetacion')
    expect(mapEstado('2.CONSTRUCCIÓN DE CONTENIDOS')).toBe('construccion')
    expect(mapEstado('1.CONTRATACIÓN')).toBe('contratacion')
    expect(mapEstado('0- NO INICIADO')).toBe('sin_novedad')
    expect(mapEstado('0. PROXIMAMENTE')).toBe('sin_novedad')
    expect(mapEstado('')).toBe('sin_novedad')
    expect(mapEstado('Requiere ajuste y revisión')).toBe('revision')
  })
  it('acepta los slugs del tablero tal cual', () => {
    expect(mapEstado('validacion_docente')).toBe('validacion_docente')
    expect(mapEstado('finalizacion')).toBe('finalizacion')
  })
})

describe('parseFecha', () => {
  it('dd/mm/yy y dd/mm/yyyy', () => {
    expect(parseFecha('07/05/25')).toEqual(new Date(2025, 4, 7))
    expect(parseFecha('22/08/2025')).toEqual(new Date(2025, 7, 22))
    expect(parseFecha('4/3/2026')).toEqual(new Date(2026, 2, 4))
  })
  it('vacío o basura da null', () => {
    expect(parseFecha('')).toBeNull()
    expect(parseFecha('—')).toBeNull()
  })
})
