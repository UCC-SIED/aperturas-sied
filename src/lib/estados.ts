export const ESTADOS = [
  'sin_novedad', 'contratacion', 'validacion_docente', 'contrato',
  'construccion', 'revision', 'maquetacion', 'finalizacion',
] as const

export type Estado = (typeof ESTADOS)[number]

export const ESTADO_LABELS: Record<Estado, string> = {
  sin_novedad: 'Sin novedad',
  contratacion: 'Contratación',
  validacion_docente: 'Validación docente',
  contrato: 'Contrato',
  construccion: 'Construcción de contenido',
  revision: 'Revisión',
  maquetacion: 'Maquetación',
  finalizacion: 'Finalizada',
}
