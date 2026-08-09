import { mapEstado } from '../../src/lib/normalizar'
import type { Estado } from '../../src/lib/estados'

type EntradaTablero = { codigo: string; docente?: string; asesor?: string; estado?: string; estado_origen?: string }

export type FilaTablero = { codigo: string; carrera: string; docente: string | null; asesor: string | null; estado: Estado }

export function parseTablero(json: string): FilaTablero[] {
  const data = JSON.parse(json) as Record<string, EntradaTablero[]>
  const filas: FilaTablero[] = []
  for (const [carrera, entradas] of Object.entries(data)) {
    for (const e of entradas) {
      if (!e.codigo || e.codigo.startsWith('PLAN-')) continue
      filas.push({
        codigo: e.codigo,
        carrera,
        docente: e.docente?.trim() || null,
        asesor: e.asesor?.trim() || null,
        estado: mapEstado(e.estado || e.estado_origen || ''),
      })
    }
  }
  return filas
}
