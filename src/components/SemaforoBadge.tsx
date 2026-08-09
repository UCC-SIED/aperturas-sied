import type { Semaforo } from '@/lib/semaforo'

const TEXTO: Record<Semaforo, string> = {
  verde: 'Lista',
  amarillo: 'En riesgo',
  rojo: 'No llega',
  gris: 'Sin riesgo aún',
}

export function SemaforoBadge({ valor }: { valor: Semaforo }) {
  return <span className={`sem-${valor}`}>{TEXTO[valor]}</span>
}
