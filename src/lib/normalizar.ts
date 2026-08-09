import { ESTADOS, type Estado } from './estados'

export function mapEstado(origen: string): Estado {
  const s = origen.trim().toLowerCase()
  if ((ESTADOS as readonly string[]).includes(s)) return s as Estado
  if (s.includes('finalizada')) return 'finalizacion'
  if (s.includes('maquetaci')) return 'maquetacion'
  if (s.includes('construcci')) return 'construccion'
  if (s.includes('contrataci')) return 'contratacion'
  if (s.includes('revisi') || s.includes('ajuste')) return 'revision'
  if (s.includes('validaci')) return 'validacion_docente'
  if (s.includes('contrato')) return 'contrato'
  return 'sin_novedad'
}

export function parseFecha(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  const [, d, mes, a] = m
  const anio = a.length === 2 ? 2000 + Number(a) : Number(a)
  return new Date(anio, Number(mes) - 1, Number(d))
}
