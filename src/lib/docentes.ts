/**
 * Separa un texto libre de docentes ("Ana Paz / Juan Ruiz" o un solo
 * nombre) en nombres individuales, sin vacíos ni duplicados.
 *
 * Sólo "/" separa personas. La coma NO separa: en los datos de origen se
 * usa para el formato "Apellido, Nombre" de una sola persona (ej. "Sánchez,
 * Gabriel Leandro") — partir por coma la convertía en dos docentes falsos.
 */
export function parseDocentes(texto: string): string[] {
  const vistos = new Set<string>()
  const nombres: string[] = []
  for (const n of texto.split('/').map((s) => s.trim()).filter(Boolean)) {
    if (!vistos.has(n)) {
      vistos.add(n)
      nombres.push(n)
    }
  }
  return nombres
}

/** Para mostrar una lista de docentes como un solo texto legible. */
export function joinDocentes(nombres: string[]): string {
  return nombres.join(' / ')
}
