/**
 * El sello de sólo lectura que ve cualquiera que no sea Unidad Académica o
 * Administración. No es un botón: quien no puede validar no tiene con qué
 * tocarlo.
 */
export function MarcaValidado() {
  return <span className="marca-validado">✓ Validado</span>
}
