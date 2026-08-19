import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <main className="pantalla-error">
      <h1>No encontramos esa página</h1>
      <p className="mensaje">
        El enlace puede estar viejo, o el período o la asignatura que buscabas ya no existe.
      </p>
      <div className="acciones-error">
        <Link href="/panel">Ir al panel</Link>
        <Link href="/asignaturas">Buscar una asignatura</Link>
      </div>
    </main>
  )
}
