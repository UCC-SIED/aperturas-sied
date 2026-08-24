import { fmtFechaISO } from '@/lib/formato'
import { Boton } from '@/components/Boton'
import { FechasDelCiclo } from '@/components/FechasDelCiclo'
import { editarPeriodo } from './actions'

type ConFechas = {
  id: number
  tipo: string
  inicioCursado: Date
  aperturaInscripcion: Date | null
  cierreInscripcion: Date | null
  finCursado: Date | null
  aperturaAfi: Date | null
  cierreAfi: Date | null
  cierreAsignatura: Date | null
  actas: Date | null
}

/**
 * Corregir las fechas de un período ya creado. Hasta ahora la acción existía
 * pero no la llamaba ninguna pantalla: si un cierre caía mal —entre Navidad y
 * Año Nuevo, por ejemplo— había que borrar el período y cargarlo de nuevo, y
 * sólo se puede borrar si todavía no tiene asignaturas planificadas.
 */
export function EditarFechasPeriodo({ periodo }: { periodo: ConFechas }) {
  return (
    <details className="editar-fechas-periodo">
      <summary>Fechas</summary>
      <form action={editarPeriodo.bind(null, periodo.id)} className="form-periodo">
        <FechasDelCiclo
          tipo={periodo.tipo}
          valores={{
            aperturaInscripcion: fmtFechaISO(periodo.aperturaInscripcion),
            cierreInscripcion: fmtFechaISO(periodo.cierreInscripcion),
            inicioCursado: fmtFechaISO(periodo.inicioCursado),
            finCursado: fmtFechaISO(periodo.finCursado),
            aperturaAfi: fmtFechaISO(periodo.aperturaAfi),
            cierreAfi: fmtFechaISO(periodo.cierreAfi),
            cierreAsignatura: fmtFechaISO(periodo.cierreAsignatura),
            actas: fmtFechaISO(periodo.actas),
          }}
        />
        <Boton enCurso="Guardando">Guardar fechas</Boton>
      </form>
    </details>
  )
}
