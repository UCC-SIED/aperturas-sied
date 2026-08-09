export type FilaAsignatura = {
  unidad: 'posgrado' | 'educacion'
  carrera: string
  cohorte: string | null
  codigo: string | null
  nombre: string
  catedra: string | null
  cargaHoraria: number | null
  orden: number | null
  duracion: string | null
  estadoOrigen: string
  periodoNombre: string | null // "Mensual_Agosto_2026" o null (educación)
  fechas: {
    inicioCursado: Date | null
    aperturaInscripcion: Date | null
    cierreInscripcion: Date | null
    finCursado: Date | null
    aperturaAfi: Date | null
    cierreAfi: Date | null
    cierreAsignatura: Date | null
    actas: Date | null
  }
}
