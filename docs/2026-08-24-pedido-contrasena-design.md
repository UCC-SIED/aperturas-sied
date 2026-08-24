# Pedido de contraseña resuelto a mano — diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado para implementar
**Autores:** Goni (Tecnología Educativa SIED) + Claude

---

## 1. Contexto y problema

Hoy "olvidé mi contraseña" es autoservicio: el usuario pide el reinicio en `/recuperar`,
el sistema le manda por correo un link con un token de un solo uso que vence a las dos
horas, y con ese link elige su contraseña nueva sin que intervenga nadie.

El flujo no funciona en producción, y no por un error de código. El envío usa Resend con
el remitente de prueba `onboarding@resend.dev`, que **sólo entrega a la casilla dueña de
la API key**. A cualquier otro usuario no le llega nada, y la aplicación no se entera
porque Resend responde OK. Para que le llegue a cualquier dirección `@ucc.edu.ar` habría
que verificar el dominio en Resend, lo que implica cargar registros DNS del dominio
institucional — un trámite que no depende del equipo de desarrollo.

En local el problema es más simple y más visible: sin `RESEND_API_KEY` el envío ni se
intenta, y el usuario ve el mensaje `El envío de correo no está configurado (falta
RESEND_API_KEY)`.

Hay una asimetría que se puede aprovechar: la casilla dueña de la API key es
`tecnologia.sied@ucc.edu.ar`, es decir la del propio equipo SIED. **Un correo dirigido
solamente a esa casilla sí llega hoy, sin verificar ningún dominio.**

## 2. Objetivo

Reemplazar el autoservicio por un pedido que el equipo SIED resuelve a mano:

1. La persona que no puede entrar deja un pedido desde `/recuperar`.
2. El pedido queda registrado en el sistema y se avisa por correo a la casilla del SIED.
3. Administración le fija una contraseña desde `/admin` —donde ya existe el campo— y se
   la comunica por fuera del sistema.

El sistema deja de mandarle correo a los usuarios. El único destinatario es la casilla
del SIED, que es la que sí recibe.

## 3. Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Canal del aviso | Lista en `/admin` **y** correo | La lista es la fuente de verdad y no puede fallar; el correo avisa. Si el envío falla, el pedido no se pierde. |
| Flujo viejo del token | Se saca | Un solo camino, sin código muerto ni dos formas de hacer lo mismo. |
| Entrega de la contraseña | Fuera del sistema | Mandar contraseñas por correo las deja en la casilla para siempre, y además volvería a chocar con el dominio sin verificar. |
| Quién resuelve | Sólo rol `admin` | No se toca el modelo de permisos. |
| Dónde se guarda el pedido | Tabla nueva, la vieja se borra | Lo que se pierde son tokens vencidos que ya no sirven. El nombre de la tabla dice lo que la tabla es. |

## 4. Modelo de datos

Se elimina `ReinicioContrasena` y se crea:

```prisma
/// Un pedido de "no puedo entrar", que el equipo SIED resuelve a mano desde
/// /admin. No hay token ni link: la contraseña la fija una persona y se la
/// comunica por fuera del sistema.
model PedidoContrasena {
  id        Int       @id @default(autoincrement())
  usuarioId Int
  usuario   Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  creado    DateTime  @default(now())
  /// Null mientras está pendiente. Se sella al fijar la contraseña o al descartarlo.
  resuelto  DateTime?
}
```

En `Usuario`, la relación `reinicios ReinicioContrasena[]` pasa a
`pedidosContrasena PedidoContrasena[]`.

Sin `resueltoPor` ni motivo de cierre: quién cambió la contraseña ya queda en la bitácora
`Cambio` con la acción `gestion_usuarios`, y repetirlo acá sería tener dos versiones de la
misma verdad que pueden discrepar.

**Un pedido pendiente por usuario.** Si alguien pide dos veces, se actualiza `creado` del
pendiente en lugar de insertar otra fila. Eso mantiene la lista legible y, de paso, evita
que alguien la infle apretando el botón en repetición.

Migración nueva escrita para PostgreSQL, como el resto del historial: `DROP TABLE
"ReinicioContrasena"` y `CREATE TABLE "PedidoContrasena"` con su índice sobre
`usuarioId`. En local el esquema se aplica con `prisma db push` (SQLite) y en producción
con `prisma migrate deploy`, que es lo que ya corre el build de Vercel.

## 5. Lo que ve quien no puede entrar

`/recuperar` conserva la tarjeta centrada y cambia los textos: pide el correo
institucional y confirma que el pedido llegó al equipo SIED, que se va a poner en
contacto. Ya no habla de links ni de plazos de dos horas.

**Se mantiene el anti-enumeración.** La pantalla responde lo mismo exista o no la cuenta,
y la fila sólo se crea si el usuario existe y está activo. Sin eso, cualquiera podría
averiguar qué direcciones están dadas de alta probándolas de una en una.

Se borra por quedar sin un solo uso:

- `src/app/recuperar/[token]/` completo (`page.tsx`, `actions.ts`, `FormRestablecer.tsx`)
- `src/lib/tokens.ts` y `tests/tokens.test.ts`
- la rama `vencido` de `src/app/recuperar/page.tsx`

Se conserva `src/app/recuperar/page.tsx` y `FormRecuperar.tsx`. La acción
`solicitarRecuperacion` de `src/app/recuperar/actions.ts` pasa a llamarse
`solicitarPedido` y mantiene la firma `(prevState, formData) => Promise<{ error: string |
null }>` que necesita `useActionState`.

En `src/lib/email.ts`, `enviarCorreoRecuperacion(destino, link)` se reemplaza por
`enviarAvisoPedido(nombre, email, linkAdmin)`, que manda a la casilla del SIED. La
constante con esa dirección vive en ese módulo, como único lugar donde figura. El enlace
tiene que ser absoluto para servir dentro de un correo: se arma con el helper `origen()`
que ya existe en `src/app/recuperar/actions.ts`, que lee `x-forwarded-proto` y `host` de
los headers del pedido.

Arreglo que entra de paso: el error `sin-contrasena` del ingreso hoy dice "pedile al
equipo SIED que te la cargue en Administración" sin ofrecer ningún camino. Pasa a apuntar
a `/recuperar`, que es exactamente para eso.

## 6. Lo que ve Administración

En `/admin`, arriba de "Dar de alta" y **sólo cuando hay pendientes**, una sección
**Pedidos de contraseña (N)** con una fila por pedido: quién, correo, cuándo lo pidió, el
campo para fijar la contraseña ahí mismo y un botón **Descartar** para lo que no
corresponda atender.

`establecerContrasena` gana una línea: al fijar la contraseña de alguien, sella sus
pedidos pendientes. Así resolver es un solo gesto y no hay que acordarse de marcar nada
aparte. Se agrega en el mismo `src/app/admin/actions.ts` una acción
`descartarPedido(pedidoId)`, detrás de la misma comprobación `puedeAdministrar` que el
resto del módulo, que sella sin tocar la contraseña.

El aviso por correo va a `tecnologia.sied@ucc.edu.ar` —la casilla dueña de la API key, así
que el remitente sandbox alcanza— con el nombre y el correo de quien pidió, y un enlace a
`/admin`.

**El correo es best-effort.** La fila se crea primero y el envío va después, dentro de un
`try/catch` que sólo escribe en el log del servidor. Esto cambia el comportamiento actual
a propósito: hoy, si Resend falla, el usuario ve el error crudo `falta RESEND_API_KEY` y
queda creyendo que no pidió nada. Con el cambio ve siempre la confirmación, porque el
pedido quedó registrado igual.

## 7. Manejo de errores

| Situación | Qué pasa |
|---|---|
| Correo vacío | La acción devuelve `Ingresá tu correo`, sin tocar la base. |
| Correo que no existe, o usuario inactivo | No se crea fila. La pantalla confirma igual (anti-enumeración). |
| Segundo pedido del mismo usuario | Se actualiza `creado` del pendiente. No se duplica. |
| `RESEND_API_KEY` sin configurar, o Resend caído | El pedido queda registrado. El fallo va al log, no a la pantalla. |
| Se resuelve un pedido de un usuario dado de baja mientras tanto | `establecerContrasena` ya valida sobre el usuario; el pedido se sella igual. |

Los errores esperados viajan como valor de retorno y se muestran con `useActionState`,
no como `throw`: en producción Next 16 no deja pasar el mensaje de una excepción al
cliente. Es la misma razón por la que existe el commit `143fdd3`.

## 8. Tests

Contra la base de test (SQLite), como el resto de la suite:

- Un correo inexistente o un usuario inactivo no crean fila, y el estado devuelto es
  indistinguible del caso exitoso.
- Pedir dos veces deja una sola fila, con `creado` actualizado.
- `establecerContrasena` sella los pendientes de ese usuario y no los de otro.
- `descartarPedido` sella sin modificar `passwordHash`.

Se borra `tests/tokens.test.ts` junto con el módulo que probaba.

## 9. Fuera de alcance

Nada de esto hace falta para que el flujo funcione, y cada uno agrega superficie que hay
que mantener:

- Contador de pendientes en la barra superior.
- Historial de pedidos ya resueltos.
- Generador de contraseñas al azar en `/admin`.
- Límite de pedidos por IP.
- Volver al autoservicio si algún día se verifica el dominio en Resend. Si eso pasa, se
  rediscute con el dominio ya verificado sobre la mesa.
