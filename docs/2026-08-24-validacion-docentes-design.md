# Validación de docentes por Unidad Académica — diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado para implementar
**Autores:** Goni (Tecnología Educativa SIED) + Claude

---

## 1. Contexto y problema

Hoy el docente tutor de una apertura lo carga quien planifica (Dirección de carrera,
Unidad académica, o el equipo SIED), y el contenidista de una asignatura lo carga el
equipo SIED desde la producción. Nadie confirma después que esa persona sea la correcta:
una vez cargado el nombre, no hay ninguna marca de que alguien lo haya revisado y esté de
acuerdo.

La Unidad Académica necesita poder dejar esa constancia — "reví este nombre y es
correcto" — sobre dos cosas puntuales: el docente tutor de una apertura, y el o los
contenidistas de una asignatura. Tiene que ser una acción que sólo ellos (y, como
excepción, Administración) puedan hacer: ni siquiera el equipo SIED, que carga la mayoría
de estos datos.

## 2. Objetivo

Agregar una validación de dos niveles:

1. **Docente tutor de una apertura** — se valida en `/planificar`, donde ya se carga.
2. **Contenidistas de una asignatura** — uno o varios, se validan todos juntos con una
   sola marca — en la ficha de la asignatura (`/asignaturas/[codigo]`).

En los dos casos: sólo Unidad Académica y Administración pueden marcar o desmarcar: ni
Dirección de carrera, ni el equipo SIED, ni Consulta. El resto de los roles ve la marca
si existe, pero no puede tocarla.

## 3. Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Quién valida | Rol `unidad` y rol `admin` únicamente | Pedido explícito: ni siquiera `sied`, que normalmente comparte permisos con `admin`. Es la primera acción de todo el sistema exclusiva de estos dos roles. |
| Modelo de datos | Dos booleanos simples (`Apertura.docenteTutorValidado`, `Asignatura.contenidistasValidados`) | Son dos casos concretos, no una necesidad genérica de "validar cualquier cosa". Una tabla de validaciones genérica agregaría un join y una capa de indirección para nada, hoy. |
| Nivel del contenidista | Uno por asignatura, no por apertura | Los contenidistas se arman una vez para la asignatura entera (1, 2 o 3 personas) y valen "hasta que se reestructure" — no cambian de un período a otro como sí cambia el tutor. |
| Varios contenidistas | Una sola marca para el grupo | Se arman y se aprueban juntos; validar a cada uno por separado no agrega información real. |
| Qué pasa si cambia el docente | La validación se borra sola | Lo que se había aprobado era esa persona puntual. Si alguien cambia el nombre después de validado, seguir mostrando "validado" sería mentir sobre quién es ahora. |
| Desmarcar a mano | Permitido | Es un interruptor, no un sello de una sola vez: Unidad (o Administración) lo prende y apaga cuando corresponda, además del reseteo automático. |

## 4. Modelo de datos

```prisma
model Apertura {
  // ...existente...
  /// Unidad Académica (o Administración) confirmó que este es el tutor correcto
  /// para esta apertura puntual. Se apaga solo si el tutor cambia.
  docenteTutorValidado Boolean @default(false)
}

model Asignatura {
  // ...existente...
  /// Unidad Académica (o Administración) confirmó el grupo de contenidistas de
  /// esta asignatura. Se apaga solo si la lista de docentes cambia.
  contenidistasValidados Boolean @default(false)
}
```

Migración nueva escrita para PostgreSQL, como el resto del historial:
`ALTER TABLE "Apertura" ADD COLUMN "docenteTutorValidado" BOOLEAN NOT NULL DEFAULT false;`
y lo mismo para `"Asignatura"."contenidistasValidados"`. En local con `prisma db push`;
en producción, `prisma migrate deploy` (ya corre en el build de Vercel).

## 5. Permisos

Nueva función en `src/lib/permisos.ts`:

```ts
/** Sólo estos dos roles pueden dejar constancia de que revisaron un docente. */
export function puedeValidarDocentes(s: Sesion | null): boolean {
  return s?.rol === 'unidad' || s?.rol === 'admin'
}
```

Deliberadamente **no** reutiliza `esEquipo` (que junta `sied` + `admin`): acá `sied`
queda afuera a propósito.

## 6. Reseteo automático

- `editarDocentesTutorApertura` (en `src/app/planificar/actions.ts`) y
  `editarDocentesApertura` (en `src/app/periodos/[id]/actions.ts`) —las dos acciones que
  pueden cambiar el tutor de una apertura— comparan la lista nueva contra la guardada; si
  difiere, escriben `docenteTutorValidado: false` junto con los docentes.
- `actualizarAsignatura` (en `src/app/asignaturas/[codigo]/actions.ts`) hace lo mismo con
  `contenidistasValidados` cuando cambia la lista de `docentes` de la asignatura.

La comparación es por conjunto de nombres (orden no importa): agregar, sacar o renombrar
a cualquiera de la lista cuenta como cambio y apaga la validación.

## 7. Pantallas

**`/planificar`** — junto a "Docente tutor: María Pérez" (o "Asignar docente tutor" si no
hay ninguno todavía):
- Unidad/Administración ven un interruptor **Validado** además del control existente para
  cargar el nombre.
- El resto (Dirección, SIED, Consulta) ve una marca **✓ Validado** de sólo lectura cuando
  corresponde, y nada cuando no.

**`/periodos/[id]`** — mismo dato, mismo criterio de sólo-lectura para quien no puede
validar (esa pantalla ya no la usan ni Unidad ni Dirección para cargar el tutor, así que
ahí la marca es siempre de sólo lectura).

**`/asignaturas/[codigo]`** — junto al campo **Docente** de la ficha:
- Unidad/Administración ven el interruptor **Contenidistas validados**.
- El resto ve la marca de sólo lectura.

Nueva acción de servidor `validarDocenteTutorApertura(aperturaId, valor)` en
`src/app/planificar/actions.ts`, y `validarContenidistas(codigo, valor)` en
`src/app/asignaturas/[codigo]/actions.ts`. Las dos siguen el patrón ya establecido hoy en
el proyecto: envueltas en `comoResultado`, devuelven `EstadoAccion`, y quedan detrás de
`puedeValidarDocentes`. Cada una deja una línea en `Cambio` (acción `valido_docente_tutor`
/ `valido_contenidistas`) con quién y cuándo.

## 8. Manejo de errores

| Situación | Qué pasa |
|---|---|
| Alguien sin permiso intenta validar (manipulando el formulario a mano) | `comoResultado` atrapa el `throw` de `puedeValidarDocentes` y devuelve `"Sólo Unidad Académica o Administración pueden validar"`. |
| Se valida una apertura o asignatura inexistente | `"Apertura inexistente"` / `"Asignatura inexistente"`, igual que el resto de las acciones. |
| El docente cambia después de validado | Se apaga solo, sin aviso — es el comportamiento esperado, no un error. |

## 9. Tests

Contra la base de test (SQLite):

- `puedeValidarDocentes`: `true` para `unidad` y `admin`, `false` para `sied`, `director`
  y `consulta`.
- Cambiar el docente tutor de una apertura validada apaga `docenteTutorValidado`; no
  tocarlo (guardar el mismo conjunto de nombres) lo deja como estaba.
- Lo mismo para `contenidistasValidados` al cambiar `docentes` de una asignatura.
- `validarDocenteTutorApertura` y `validarContenidistas` rechazan a un `sied` o
  `director` con el mensaje de permiso, y funcionan para `unidad` y `admin`.

## 10. Fuera de alcance

- Historial de validaciones pasadas (quién validó y desvalidó cada vez) — la bitácora
  `Cambio` ya guarda cada evento; una vista dedicada se puede armar después si hace falta.
- Validar a cada contenidista por separado.
- Extender el mecanismo a otros campos (asesor, observaciones): se decide si aparece esa
  necesidad real, no antes.
