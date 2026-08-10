import { describe, it, expect } from 'vitest'
import { calcularCambios, type FilaSeguimiento } from '@/lib/seguimiento'

const fila = (extra: Partial<FilaSeguimiento> = {}): FilaSeguimiento => ({
  codigo: 'EP001',
  estado: 'construccion',
  docente: 'Juan Pérez',
  asesor: 'Ana López',
  observaciones: null,
  ...extra,
})

/** Emula el FormData que manda la pantalla de seguimiento. */
const form = (valores: Record<string, string>) => ({
  get: (name: string) => (name in valores ? valores[name] : null),
})

describe('calcularCambios', () => {
  it('no reporta nada cuando se guarda sin tocar nada', () => {
    const cambios = calcularCambios([fila()], form({
      estado_EP001: 'construccion',
      docente_EP001: 'Juan Pérez',
      asesor_EP001: 'Ana López',
      observaciones_EP001: '',
    }))
    expect(cambios).toEqual([])
  })

  it('detecta el cambio de estado y lo describe con nombres legibles', () => {
    const cambios = calcularCambios([fila()], form({
      estado_EP001: 'maquetacion',
      docente_EP001: 'Juan Pérez',
      asesor_EP001: 'Ana López',
      observaciones_EP001: '',
    }))
    expect(cambios).toHaveLength(1)
    expect(cambios[0].campos).toEqual({ estado: 'maquetacion' })
    expect(cambios[0].detalle).toBe('Construcción de contenido → Maquetación')
  })

  it('junta varios campos de la misma asignatura en un solo registro', () => {
    const cambios = calcularCambios([fila()], form({
      estado_EP001: 'revision',
      docente_EP001: 'Otro Docente',
      asesor_EP001: 'Ana López',
      observaciones_EP001: 'Falta el video',
    }))
    expect(cambios).toHaveLength(1)
    expect(cambios[0].campos).toEqual({
      estado: 'revision',
      docente: 'Otro Docente',
      observaciones: 'Falta el video',
    })
    expect(cambios[0].detalle).toContain('→ Revisión')
    expect(cambios[0].detalle).toContain('docente: Otro Docente')
    expect(cambios[0].detalle).toContain('observaciones actualizadas')
  })

  it('sólo devuelve las filas tocadas, no las 30 de la pantalla', () => {
    const actuales = [
      fila({ codigo: 'A' }),
      fila({ codigo: 'B' }),
      fila({ codigo: 'C' }),
    ]
    const cambios = calcularCambios(actuales, form({
      estado_A: 'construccion', docente_A: 'Juan Pérez', asesor_A: 'Ana López', observaciones_A: '',
      estado_B: 'finalizacion', docente_B: 'Juan Pérez', asesor_B: 'Ana López', observaciones_B: '',
      estado_C: 'construccion', docente_C: 'Juan Pérez', asesor_C: 'Ana López', observaciones_C: '',
    }))
    expect(cambios.map((c) => c.codigo)).toEqual(['B'])
  })

  it('un campo vaciado se guarda como nulo, no como texto vacío', () => {
    const cambios = calcularCambios([fila()], form({
      estado_EP001: 'construccion',
      docente_EP001: '   ',
      asesor_EP001: 'Ana López',
      observaciones_EP001: '',
    }))
    expect(cambios[0].campos.docente).toBeNull()
    expect(cambios[0].detalle).toContain('se quitó el docente')
  })

  it('un campo que no vino en el formulario deja el valor como está', () => {
    // el navegador no manda inputs deshabilitados; no debe interpretarse como borrado
    const cambios = calcularCambios([fila()], form({ estado_EP001: 'construccion' }))
    expect(cambios).toEqual([])
  })

  it('rechaza un estado que no existe', () => {
    expect(() =>
      calcularCambios([fila()], form({ estado_EP001: 'inventado' })),
    ).toThrow(/Estado inválido/)
  })
})
