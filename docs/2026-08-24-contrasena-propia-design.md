# Cada persona, dueña de su contraseña — diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado para implementar
**Autores:** Goni (Tecnología Educativa SIED) + Claude

---

## 1. Contexto y problema

Hoy la contraseña de cada persona la elige y la conoce administración. `crearUsuario`
exige tipear una de al menos 8 caracteres, que se le dicta a la persona y queda para
siempre. Nadie —ni siquiera quien administra— puede cambiar la suya propia: el único
camino es `/admin`, y sólo lo abre el rol `admin`.

Eso deja dos problemas. Uno es que la contraseña de los 16 usuarios actuales la conoce
alguien más que su dueño, de forma permanente. El otro es más práctico: cada alta obliga
a inventar una contraseña a mano, lo que en la realidad termina en la misma de siempre o
en algo débil.

Y hay un tercer efecto, más sutil: si administración conoce la contraseña de todos, la
bitácora deja de significar lo que dice. Una línea que dice "Dirección de Empresas quitó
esta apertura" sólo prueba quién la quitó si nadie más podía entrar con esa cuenta.

## 2. Objetivo

Que la contraseña de cada persona la sepa solamente esa persona.

1. Al dar de alta, el sistema genera una provisoria distinta por persona y se la muestra
   una sola vez a administración para que la dicte.
2. Al primer ingreso, la persona elige la suya en una pantalla que no se puede saltear.
3. Desde ahí, cualquiera puede cambiar su contraseña cuando quiera, desde su perfil.
4. Cada vez que administración le fija una contraseña a alguien —incluido al resolver un
   pedido—, vuelve a pedirse que la reemplace al entrar.

## 3. Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Cuándo se obliga a elegir | En el alta **y** en cada reinicio hecho por administración | En los dos casos alguien que no es el dueño conoce la contraseña. Tiene que dejar de servir en cuanto la persona entre. |
| Los 16 usuarios actuales | También la cambian | Deja el sistema parejo: nadie queda usando una contraseña que administración conozca. Requiere avisarles antes. |
| Quién inventa la provisoria | El sistema | Administración deja de tipear contraseñas. Evita el reflejo de poner siempre la misma, y como dura un solo ingreso su comodidad importa más que su fuerza. |
| Contraseña inicial compartida | Descartada | Se evaluó una sola contraseña igual para todos, más cómoda de comunicar. En esta app la contraseña **es** la identidad: mientras alguien no la cambiara, cualquiera que la conociera podría entrar con su cuenta —una dirección viendo y editando otra carrera, o una cuenta con rol `admin`—. Y como el cambio sería un pedido y no una obligación, la mayoría no la cambiaría. |
| Dónde se hace cumplir | En la función que devuelve la sesión | Ver la sección 6: el chequeo en el layout raíz **no funciona** en el App Router. |

## 4. Modelo de datos

Un campo nuevo en `Usuario`:

```prisma
  /// Mientras esté en true, la persona no puede usar el sistema hasta elegir una
  /// contraseña propia. Arranca en true porque la provisoria del alta la conoce
  /// administración: tiene que dejar de servir en cuanto la persona entre.
  debeElegirContrasena Boolean @default(true)
```

El `@default(true)` resuelve dos cosas de una sola vez: los usuarios nuevos arrancan
marcados, y la migración —`ADD COLUMN ... NOT NULL DEFAULT true`— deja marcados a los 16
que ya existen. No hace falta ningún script de backfill.

El campo se agrega al tipo `Sesion` de `src/lib/permisos.ts` y lo puebla `sesionActual()`,
que ya lee el usuario de la base en cada pedido.

## 5. El alta ya no pide contraseña

En `/admin`, el campo **Contraseña** desaparece del formulario de alta. `crearUsuario`
genera la provisoria y **la devuelve para mostrarla una sola vez** en pantalla, para
copiar y dictar.

La provisoria se arma con tres palabras de una lista de 100 —cortas, sin tildes ni ñ, para
que se puedan dictar por teléfono y tipear en cualquier teclado— más tres dígitos:
`mora-sauce-tren-472`. Son unos 900 millones de combinaciones.

Un cambio de patrón que hay que hacer a propósito: el resto de las acciones de
`src/app/admin/actions.ts` lanza excepciones que recoge `src/app/error.tsx`, pero
`crearUsuario` tiene que **devolver** un valor para poder mostrar la provisoria. Va por
`useActionState`, en un componente cliente nuevo (`src/app/admin/FormAlta.tsx`). La
provisoria no puede viajar en la URL: quedaría en el historial del navegador y en los
logs del servidor.

Como consecuencia, las validaciones que hoy lanza `crearUsuario` —correo no institucional,
nombre vacío, rol inválido, correo ya existente— pasan a devolverse como texto de error y
se muestran dentro del formulario, al lado de los campos. Es mejor que hoy: hoy sacan a la
persona de la pantalla y le hacen perder lo que había escrito.

## 6. Cómo se hace cumplir

**El chequeo no va en el layout raíz.** La documentación de Next 16 en
`node_modules/next/dist/docs/01-app/02-guides/authentication.md` lo dice explícitamente:

> Due to Partial Rendering, be cautious when doing checks in Layouts as these don't
> re-render on navigation, meaning the user session won't be checked on every route
> change.

Un guardia en el layout se dispararía al cargar una página de cero y **no** al navegar con
un enlace de la barra. La misma guía recomienda hacer el chequeo cerca del dato, en la
función que devuelve la sesión, porque así "wherever `getUser()` is called within your
application, the auth check is performed, and prevents developers from forgetting to
check".

Este proyecto ya tiene esa función. Se agrega al lado, en `src/lib/sesion.ts`:

```ts
/** La sesión de alguien que puede usar el sistema. Si no puede, no vuelve. */
export async function exigirSesion(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (s.debeElegirContrasena) redirect('/elegir-contrasena')
  return s
}
```

Y en las **10 pantallas** que hoy repiten esto:

```ts
const s = await sesionActual()
if (!s) redirect('/ingresar')
```

queda esto:

```ts
const s = await exigirSesion()
```

Es menos código que hoy, no más. Y como todas las pantallas son `force-dynamic`, el
chequeo corre en cada pedido de cada pantalla, sin depender de que un layout se
reejecute.

`src/app/page.tsx` (el redirector de la raíz) y `src/app/exportar/route.ts` también pasan
a usarla: un usuario marcado no debería poder descargar la planilla.

**La única excepción es `/elegir-contrasena`**, que llama a `sesionActual()` directo —con
`exigirSesion()` entraría en un bucle infinito consigo misma—. `/perfil` sí usa
`exigirSesion()`: mientras haya que elegir, se va a `/elegir-contrasena`, que es
justamente el punto.

### Las server actions también chequean

Un formulario puede dispararse sin pasar por una pantalla, así que las acciones que
escriben datos verifican por su cuenta. Para eso va una segunda función en
`src/lib/sesion.ts`, hermana de `exigirSesion()` pero que **lanza en vez de redirigir**,
porque es el patrón de las acciones de este proyecto:

```ts
/** Como exigirSesion(), para usar dentro de una server action. */
export async function exigirSesionActiva(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) throw new Error('Tenés que ingresar de nuevo')
  if (s.debeElegirContrasena) {
    throw new Error('Antes de seguir tenés que elegir una contraseña propia')
  }
  return s
}
```

Se aplica en los seis módulos de acciones que escriben:

| Archivo | Cómo entra |
|---|---|
| `src/app/admin/actions.ts` | dentro de `exigirAdmin()` |
| `src/app/periodos/actions.ts` | dentro de `exigirPermiso()` |
| `src/app/periodos/[id]/actions.ts` | dentro de su guardia |
| `src/app/planificar/actions.ts` | dentro de su guardia |
| `src/app/produccion/actions.ts` | reemplaza el `sesionActual()` de `guardarSeguimiento` |
| `src/app/asignaturas/[codigo]/actions.ts` | reemplaza su `sesionActual()` |

Las de `/recuperar` **no** cambian: las usa gente que todavía no ingresó.

## 7. Las dos pantallas nuevas

**`/elegir-contrasena`** usa la tarjeta centrada del ingreso, con la misma marca
institucional. Pide la contraseña nueva y su repetición. **No pide la actual**: la persona
la acaba de usar para entrar. Al guardar, baja la marca y entra al sistema.

Se suma a la lista `SIN_MARCO` de `src/components/Marco.tsx`, para que se muestre sola,
sin la barra de navegación —cuyos enlaces, estando marcado, rebotan todos.

**`/perfil`** es la pantalla de cualquiera que haya ingresado. Pide la contraseña actual,
la nueva y su repetición. Pedir la actual es lo que evita que alguien que encuentre una
sesión abierta se apropie de la cuenta. Se llega desde el nombre de la persona en la barra
superior, que pasa a ser un enlace.

Las dos escriben por `src/lib/credenciales.ts`, que expone tres cosas:
`generarProvisoria()`, `elegirPrimeraContrasena(usuarioId, nueva)` —sin verificar la
anterior— y `cambiarContrasenaPropia(usuarioId, actual, nueva)`. Las dos últimas comparten
un escritor privado, así que la validación de largo mínimo, el hash y el registro en la
bitácora están en un solo lugar.

## 8. Manejo de errores

| Situación | Qué pasa |
|---|---|
| Las dos contraseñas nuevas no coinciden | La pantalla lo dice y no toca nada. |
| La contraseña nueva tiene menos de 8 caracteres | Lo dice y no toca nada. Es el `CONTRASENA_MINIMA` que ya existe. |
| En `/perfil`, la contraseña actual no coincide | Lo dice y no toca nada. |
| La contraseña nueva es igual a la actual | Se acepta. Rechazarla obligaría a comparar hashes para nada: no mejora la seguridad y confunde a quien sólo quiso confirmarla. |
| Un usuario marcado abre cualquier pantalla | `exigirSesion()` lo manda a `/elegir-contrasena`. |
| Un usuario marcado dispara una server action | La acción corta con el mismo error de permisos que ya usa cada módulo. |
| Un usuario sin `passwordHash` | No cambia nada: no puede ingresar, y el mensaje `sin-contrasena` ya lo manda a `/recuperar`. |

Los errores esperados viajan como valor de retorno y se muestran con `useActionState`, no
como `throw`: en producción Next 16 no deja pasar el mensaje de una excepción al cliente.

## 9. Tests

En `tests/credenciales.test.ts`, sobre la base de test:

- `generarProvisoria()` devuelve el formato `palabra-palabra-palabra-NNN`, sin tildes ni
  ñ, y dos llamadas seguidas no coinciden.
- `elegirPrimeraContrasena` guarda el hash, baja la marca y anota en la bitácora.
- `cambiarContrasenaPropia` falla si la actual no coincide, y en ese caso **no** modifica
  el hash guardado.
- `cambiarContrasenaPropia` funciona si la actual coincide, y deja la marca en false.
- Las dos rechazan una contraseña de menos de 8 caracteres sin tocar la base.
- `establecerContrasena` (la de administración) vuelve a poner la marca en true.

Y un test de cobertura estructural en `tests/guardias.test.ts`: recorre
`src/app/**/page.tsx` y verifica que toda pantalla autenticada use `exigirSesion`. Es lo
que evita que una pantalla nueva se agregue sin guardia dentro de seis meses —el riesgo
real de repartir el chequeo en 10 lugares.

## 10. Fuera de alcance

- Que la persona cambie su propio correo o su nombre.
- Historial de contraseñas usadas, o prohibir repetir las últimas N.
- Caducidad: obligar a cambiarla cada X meses.
- **Límite de intentos en el ingreso.** Hoy no hay ninguno, y es un agujero real e
  independiente de esto: alguien puede probar contraseñas sin freno. Conviene mirarlo,
  pero no acá.
- Segundo factor.
