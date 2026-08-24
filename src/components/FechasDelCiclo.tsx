'use client'

import { useRef } from 'react'
import { cicloPosgrado } from '@/lib/ciclo'

const CAMPOS = [
  ['aperturaInscripcion', 'Apertura de inscripción'],
  ['cierreInscripcion', 'Cierre de inscripción'],
  ['inicioCursado', 'Inicio de cursado'],
  ['finCursado', 'Límite de entregas'],
  ['aperturaAfi', 'Apertura del AFI'],
  ['cierreAfi', 'Vencimiento del AFI'],
  ['cierreAsignatura', 'Cierre de asignatura'],
  ['actas', 'Actas'],
] as const

type Campo = (typeof CAMPOS)[number][0]

/** aaaa-mm-dd, que es lo que espera un <input type="date"> y lo que lee el servidor. */
function aISO(f: Date | null): string {
  if (!f) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`
}

function deISO(v: string): Date | null {
  const [a, m, d] = v.split('-').map(Number)
  return a && m && d ? new Date(a, m - 1, d) : null
}

/**
 * Las ocho fechas del ciclo. En un período mensual —los de Posgrado— poner el
 * inicio de cursado completa las demás con las reglas del calendario, y todas
 * quedan editables: la regla acierta en el caso normal, pero un cierre que cae
 * entre Navidad y Año Nuevo hay que poder correrlo a mano.
 *
 * Respeta lo que se haya escrito a mano: si el inicio de cursado cambia, sólo
 * recalcula las fechas que todavía tenían el valor que la regla había puesto.
 * Sin eso, corregir el inicio dejaba las demás con las fechas del inicio viejo,
 * o pisaba un cierre que alguien había corrido a propósito.
 */
export function FechasDelCiclo({
  tipo,
  valores = {},
}: {
  /** El tipo elegido en el formulario. Las reglas son sólo de los mensuales. */
  tipo?: string
  valores?: Partial<Record<Campo, string>>
}) {
  const ref = useRef<HTMLDivElement>(null)
  /** Lo último que puso la regla, para distinguirlo de lo escrito a mano. */
  const calculado = useRef<Partial<Record<Campo, string>>>({})

  function completar(inicio: string) {
    const caja = ref.current
    if (!caja) return
    const fecha = deISO(inicio)
    if (!fecha) return

    // Educación tiene su propio calendario y otras reglas: acá se aplican sólo
    // las de Posgrado, que son las de los períodos mensuales.
    const tipoElegido =
      caja.closest('form')?.querySelector<HTMLSelectElement>('[name="tipo"]')?.value ?? tipo
    if (tipoElegido !== 'mensual') return

    const ciclo = cicloPosgrado(fecha)
    for (const [campo] of CAMPOS) {
      if (campo === 'inicioCursado') continue
      const input = caja.querySelector<HTMLInputElement>(`[name="${campo}"]`)
      if (!input) continue

      // Se escribe si está vacío o si sigue teniendo lo que puso la regla la
      // vez anterior. Si el valor es otro, lo cambió una persona y manda esa.
      const loEscribioUnaPersona = input.value && input.value !== calculado.current[campo]
      if (loEscribioUnaPersona) continue

      const nuevo = aISO(ciclo[campo])
      input.value = nuevo
      calculado.current[campo] = nuevo
    }
  }

  return (
    <div ref={ref} className="fila-campos fechas">
      {CAMPOS.map(([campo, etiqueta]) => (
        <label key={campo} htmlFor={campo}>
          {etiqueta}
          {campo === 'inicioCursado' && <span className="requerido"> *</span>}
          <input
            id={campo}
            name={campo}
            type="date"
            required={campo === 'inicioCursado'}
            defaultValue={valores[campo] ?? ''}
            onChange={campo === 'inicioCursado' ? (e) => completar(e.currentTarget.value) : undefined}
          />
        </label>
      ))}
    </div>
  )
}
