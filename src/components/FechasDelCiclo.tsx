'use client'

import { useEffect, useRef } from 'react'
import { cicloPosgrado } from '@/lib/ciclo'

const CAMPOS = [
  ['aperturaInscripcion', 'Apertura de inscripción'],
  ['cierreInscripcion', 'Cierre de inscripción'],
  ['inicioCursado', 'Inicio de cursado'],
  ['finCursado', 'Límite de entregas'],
  ['aperturaAfi', 'Apertura del AFI'],
  ['cierreAfi', 'Vencimiento del AFI'],
  ['cierreAsignatura', 'Cierre de asignatura'],
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

  /** El tipo que está elegido ahora en el formulario, que puede haber cambiado. */
  function tipoActual(caja: HTMLDivElement): string | undefined {
    return caja.closest('form')?.querySelector<HTMLSelectElement>('[name="tipo"]')?.value ?? tipo
  }

  function completar(inicio: string) {
    const caja = ref.current
    if (!caja) return
    const fecha = deISO(inicio)
    if (!fecha) return

    // Educación tiene su propio calendario y otras reglas: acá se aplican sólo
    // las de Posgrado, que son las de los períodos mensuales.
    if (tipoActual(caja) !== 'mensual') return

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

  /**
   * Al abrir la pantalla de corregir un período, los campos ya vienen con
   * fechas. Se anota cuáles coinciden con lo que daría la regla, para poder
   * recalcularlas si después se corrige el inicio: sin esto se las tomaba a
   * todas por escritas a mano y no se movía ninguna.
   */
  useEffect(() => {
    const inicio = deISO(valores.inicioCursado ?? '')
    if (!inicio || tipo !== 'mensual') return
    const ciclo = cicloPosgrado(inicio)
    for (const [campo] of CAMPOS) {
      if (campo === 'inicioCursado') continue
      if ((valores[campo] ?? '') === aISO(ciclo[campo])) {
        calculado.current[campo] = valores[campo]
      }
    }
    // Sólo al montar: después manda lo que vaya escribiendo la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Cambiar la unidad o el tipo también recalcula. Es la trampa más fácil de
   * pisar al cargar un período: poner primero la fecha —con Educación elegida,
   * que es lo que viene por defecto— y recién después cambiar a Posgrado. Sin
   * esto, las fechas quedaban vacías y no había forma obvia de completarlas.
   */
  useEffect(() => {
    const caja = ref.current
    const form = caja?.closest('form')
    if (!caja || !form) return

    const alCambiar = (e: Event) => {
      const destino = e.target as HTMLElement | null
      const nombre = destino?.getAttribute('name')
      if (nombre !== 'tipo' && nombre !== 'unidadId') return
      const inicio = caja.querySelector<HTMLInputElement>('[name="inicioCursado"]')?.value
      // El selector de tipo se rearma al cambiar la unidad: se espera un cuadro.
      if (inicio) setTimeout(() => completar(inicio), 0)
    }

    form.addEventListener('change', alCambiar)
    return () => form.removeEventListener('change', alCambiar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className="fila-campos fechas">
      {CAMPOS.map(([campo, etiqueta]) => (
        <label key={campo} htmlFor={campo}>
          {/* El texto y el asterisco van juntos en un span: la etiqueta es un
              grid y, sueltos, el asterisco se lleva una fila entera. */}
          <span>
            {etiqueta}
            {campo === 'inicioCursado' && <span className="requerido"> *</span>}
          </span>
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
