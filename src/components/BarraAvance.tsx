/**
 * Barra de avance. El color acompaña al número: leer catorce filas de
 * porcentajes grises no deja ver cuál está trabada y cuál va bien.
 */
export function BarraAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  const tono = porcentaje >= 66 ? 'alto' : porcentaje >= 33 ? 'medio' : 'bajo'
  return (
    <div
      className="barra"
      role="progressbar"
      aria-valuenow={porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
    >
      <div className={`relleno ${tono}`} style={{ transform: `scaleX(${porcentaje / 100})` }} />
      <span>{porcentaje}%</span>
    </div>
  )
}
