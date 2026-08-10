'use client'

/**
 * Cuando una acción falla —permisos, un dato que ya no existe, la base caída—
 * el usuario tiene que entender qué pasó y poder seguir trabajando. Sin esto
 * aparece la pantalla de error cruda del framework.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="pantalla-error">
      <h1>No se pudo completar la acción</h1>
      <p className="mensaje">{error.message || 'Ocurrió un problema inesperado.'}</p>
      <div className="acciones-error">
        <button onClick={reset}>Reintentar</button>
        <a href="/planificar">Volver al planificador</a>
      </div>
      {error.digest && <p className="referencia">Referencia: {error.digest}</p>}
    </main>
  )
}
