'use client'

import { useEffect, useRef } from 'react'
import { cicloDelPeriodo } from '@/lib/ciclo'

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

/** Las que se escriben a mano y disparan el cálculo, no las que se calculan. */
const DISPARADORES: Campo[] = ['inicioCursado', 'aperturaAfi']

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
 * Las siete fechas del ciclo, con las reglas del calendario aplicadas al
 * cargar y todo editable.
 *
 * En un **mensual** —Posgrado— alcanza con el inicio de cursado: las seis
 * restantes salen de ahí. En un **bimestral** hacen falta dos, el inicio y la
 * apertura del AFI, porque esa última marca el fin del cursado y no se puede
 * deducir: los bimestres A y C duran cinco semanas y los B y D, cuatro, y el
 * sistema sólo guarda el tipo. En un **cuatrimestral** se propone el AFI a las
 * doce semanas, que es lo que da el calendario real, y se puede corregir.
 *
 * Respeta lo escrito a mano: al cambiar un disparador sólo recalcula las
 * fechas que todavía tenían el valor que la regla había puesto. Sin eso,
 * corregir el inicio dejaba las demás con las fechas viejas, o pisaba un
 * cierre que alguien había corrido a propósito.
 */
export function FechasDelCiclo({
  tipo,
  valores = {},
}: {
  /** El tipo del período. En el alta lo elige un selector y puede cambiar. */
  tipo?: string
  valores?: Partial<Record<Campo, string>>
}) {
  const ref = useRef<HTMLDivElement>(null)
  /** Lo último que puso la regla, para distinguirlo de lo escrito a mano. */
  const calculado = useRef<Partial<Record<Campo, string>>>({})

  function completar() {
    const caja = ref.current
    if (!caja) return

    const leer = (campo: Campo) =>
      caja.querySelector<HTMLInputElement>(`[name="${campo}"]`)?.value ?? ''
    const inicio = deISO(leer('inicioCursado'))
    if (!inicio) return

    // El tipo se lee del formulario porque en el alta puede cambiar mientras
    // se carga; en la pantalla de corregir viene fijo por prop.
    const tipoElegido =
      caja.closest('form')?.querySelector<HTMLSelectElement>('[name="tipo"]')?.value ?? tipo
    if (!tipoElegido) return

    // La apertura del AFI, si ya está puesta a mano, manda sobre lo que
    // propondría la regla: es el dato que en Educación no se puede deducir.
    const afiEscrito = leer('aperturaAfi')
    const afiManual =
      afiEscrito && afiEscrito !== calculado.current.aperturaAfi ? deISO(afiEscrito) : null

    const ciclo = cicloDelPeriodo(tipoElegido, inicio, afiManual)
    if (!ciclo) return

    for (const [campo] of CAMPOS) {
      if (campo === 'inicioCursado') continue
      const input = caja.querySelector<HTMLInputElement>(`[name="${campo}"]`)
      if (!input) continue

      // Se escribe si está vacío o si sigue teniendo lo que puso la regla la
      // vez anterior. Si el valor es otro, lo cambió una persona y manda esa.
      const loEscribioUnaPersona = input.value && input.value !== calculado.current[campo]
      if (loEscribioUnaPersona) continue

      const nuevo = aISO(ciclo[campo])
      // Un bimestral sin AFI deja media tabla en null: no se borra lo que ya
      // hubiera, sólo se deja de proponer.
      if (!nuevo) continue

      input.value = nuevo
      calculado.current[campo] = nuevo
    }
  }

  /**
   * Al abrir la pantalla de corregir un período, los campos ya vienen con
   * fechas. Se anota cuáles coinciden con lo que daría la regla, para poder
   * recalcularlas si después se corrige un disparador: sin esto se las tomaba
   * a todas por escritas a mano y no se movía ninguna.
   */
  useEffect(() => {
    const inicio = deISO(valores.inicioCursado ?? '')
    if (!inicio || !tipo) return
    const ciclo = cicloDelPeriodo(tipo, inicio, deISO(valores.aperturaAfi ?? ''))
    if (!ciclo) return
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
    const form = ref.current?.closest('form')
    if (!form) return

    const alCambiar = (e: Event) => {
      const nombre = (e.target as HTMLElement | null)?.getAttribute('name')
      if (nombre !== 'tipo' && nombre !== 'unidadId') return
      // El selector de tipo se rearma al cambiar la unidad: se espera un cuadro.
      setTimeout(completar, 0)
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
            onChange={DISPARADORES.includes(campo) ? completar : undefined}
          />
        </label>
      ))}
    </div>
  )
}
