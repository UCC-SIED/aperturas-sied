# Pedido de contraseña resuelto a mano — plan de implementación

> **Para quien lo ejecute:** usar `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ir tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** reemplazar el autoservicio de recuperar contraseña por un pedido que queda
registrado en la base y que el rol Administración resuelve a mano desde `/admin`.

**Arquitectura:** la lógica de datos vive en `src/lib/pedidos.ts` y se prueba contra la
base de test; las server actions quedan como envoltorios finos que sólo traducen entre el
formulario y esa librería. El aviso por correo es best-effort: el pedido se registra
primero y el envío va después, en un `try/catch` que sólo escribe en el log.

**Stack:** Next 16 (App Router, server actions), Prisma 6, PostgreSQL en producción y
SQLite en desarrollo y tests, Vitest, Resend.

Diseño aprobado: [docs/2026-08-24-pedido-contrasena-design.md](2026-08-24-pedido-contrasena-design.md)

## Restricciones globales

- **Todo en castellano rioplatense**: nombres de funciones, variables, comentarios, textos
  de pantalla y mensajes de commit. Es la convención del repo entero, sin excepciones.
- **Los comentarios explican por qué, no qué.** Mirá los que ya hay en `src/lib/` como
  referencia de tono y de largo.
- **Errores esperados como valor de retorno, nunca `throw`**, en cualquier acción que
  alimente un `useActionState`: en producción Next 16 no deja pasar el mensaje de una
  excepción al cliente. Las acciones de `/admin` sí usan `throw` porque las recoge
  `src/app/error.tsx`; seguí el patrón de cada archivo.
- **`prisma generate` falla en Windows si el servidor de desarrollo está corriendo**
  (`EPERM ... query_engine-windows.dll.node`). Pará el dev server antes de cualquier paso
  que regenere el cliente.
- **El `provider` de `prisma/schema.prisma` se reescribe según a dónde apunte la base.**
  Para trabajar en local tiene que decir `sqlite`: corré `npm run db:local` si aparece un
  error `the URL must start with the protocol postgresql://`. No commitear el schema
  apuntando a `postgresql`.
- **Las migraciones versionadas se escriben para PostgreSQL** (`migration_lock.toml` dice
  `postgresql`). En local el esquema se aplica con `prisma db push`, nunca con
  `migrate dev`.
- **Longitud mínima de contraseña: 8 caracteres**, ya definida en
  `src/app/admin/actions.ts` como `CONTRASENA_MINIMA`. No duplicar el número.
- La casilla del equipo SIED es `tecnologia.sied@ucc.edu.ar` y después de este cambio
  figura en un solo lugar del código: `src/lib/email.ts`.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `prisma/schema.prisma` | Modelo `PedidoContrasena`; se va `ReinicioContrasena` | 1 |
| `prisma/migrations/20260824120000_pedido_contrasena/migration.sql` | Drop de la tabla vieja, alta de la nueva | 1 |
| `src/lib/pedidos.ts` | **Nuevo.** Registrar, sellar y listar pedidos. Todo el acceso a la tabla pasa por acá | 2 |
| `tests/pedidos.test.ts` | **Nuevo.** Pruebas de esa librería contra la base de test | 2 |
| `src/lib/email.ts` | Aviso a la casilla del SIED; deja de mandarle correo a los usuarios | 3 |
| `src/app/recuperar/actions.ts` | Acción del formulario: registra y avisa | 3 |
| `src/app/recuperar/page.tsx` | Textos del pedido; se va la rama `vencido` | 3 |
| `src/app/recuperar/FormRecuperar.tsx` | Etiqueta del botón y nombre de la acción | 3 |
| `src/app/ingresar/page.tsx` | Mensaje `sin-contrasena` que ofrezca una salida | 3 |
| `src/app/recuperar/[token]/` | **Se borra** completo | 3 |
| `src/lib/tokens.ts`, `tests/tokens.test.ts` | **Se borran**: quedan sin un solo uso | 3 |
| `src/app/admin/actions.ts` | `descartarPedido`, y `establecerContrasena` sella pendientes | 4 |
| `src/app/admin/page.tsx` | Sección "Pedidos de contraseña" arriba de "Dar de alta" | 4 |

---

## Tarea 1: Modelo y migración

**Archivos:**
- Modificar: `prisma/schema.prisma` (modelo `Usuario`, líneas 33-48, y modelo `ReinicioContrasena`, líneas 51-62)
- Crear: `prisma/migrations/20260824120000_pedido_contrasena/migration.sql`

**Interfaces:**
- Consume: nada.
- Produce: el modelo Prisma `PedidoContrasena` con los campos `id: number`,
  `usuarioId: number`, `creado: Date`, `resuelto: Date | null`, y la relación
  `usuario`. En el cliente de Prisma queda accesible como
  `prisma.pedidoContrasena`. En `Usuario`, la relación inversa se llama
  `pedidosContrasena`.

- [ ] **Paso 1: asegurarse de que el esquema apunte a SQLite**

```bash
npm run db:local
```

Esperado: `schema.prisma ya está en sqlite` o `schema.prisma: postgresql -> sqlite`.

- [ ] **Paso 2: reemplazar el modelo en el esquema**

En `prisma/schema.prisma`, dentro del modelo `Usuario`, cambiar la línea:

```prisma
  reinicios    ReinicioContrasena[]
```

por:

```prisma
  pedidosContrasena PedidoContrasena[]
```

Y reemplazar el bloque entero del modelo viejo:

```prisma
/// Un pedido de "olvidé mi contraseña": el link que se manda por correo
/// vale una sola vez y vence a las dos horas. Se guarda el hash del token,
/// nunca el token en sí — igual que la contraseña.
model ReinicioContrasena {
  id        Int      @id @default(autoincrement())
  usuarioId Int
  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expira    DateTime
  usado     Boolean  @default(false)
  creado    DateTime @default(now())
}
```

por:

```prisma
/// Un pedido de "no puedo entrar", que el equipo SIED resuelve a mano desde
/// /admin. No hay token ni link: la contraseña la fija una persona y se la
/// comunica por fuera del sistema, porque el remitente de prueba de Resend
/// sólo entrega a la casilla del SIED.
model PedidoContrasena {
  id        Int       @id @default(autoincrement())
  usuarioId Int
  usuario   Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  creado    DateTime  @default(now())
  /// Null mientras está pendiente. Se sella al fijar la contraseña o al descartarlo.
  resuelto  DateTime?

  @@index([usuarioId])
}
```

- [ ] **Paso 3: escribir la migración para PostgreSQL**

Crear `prisma/migrations/20260824120000_pedido_contrasena/migration.sql`:

```sql
-- DropTable
DROP TABLE "ReinicioContrasena";

-- CreateTable
CREATE TABLE "PedidoContrasena" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto" TIMESTAMP(3),

    CONSTRAINT "PedidoContrasena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoContrasena_usuarioId_idx" ON "PedidoContrasena"("usuarioId");

-- AddForeignKey
ALTER TABLE "PedidoContrasena" ADD CONSTRAINT "PedidoContrasena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

El `DROP TABLE` no lleva `IF EXISTS` a propósito: la tabla existe en producción porque la
creó la migración `20260819190000_reinicio_contrasena`, y si no existiera querríamos que
la migración falle en vez de seguir con un esquema distinto al esperado.

- [ ] **Paso 4: parar el servidor de desarrollo y regenerar el cliente**

Si hay un `next dev` corriendo, pararlo primero: en Windows `prisma generate` no puede
reemplazar el `.dll` mientras el proceso lo tiene abierto.

```bash
npx prisma generate
```

Esperado: `✔ Generated Prisma Client`.

- [ ] **Paso 5: aplicar el esquema a la base local**

```bash
npx prisma db push
```

Esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Paso 6: verificar que el cliente conoce el modelo nuevo**

```bash
npx tsc --noEmit
```

**Esperado: errores, y sólo en estos tres archivos.** El flujo viejo del token sigue
referenciando el modelo que acabamos de borrar, y se limpia en la tarea 3 — no lo toques
acá:

- `src/app/recuperar/actions.ts` (usa `prisma.reinicioContrasena.create`)
- `src/app/recuperar/[token]/actions.ts`
- `src/app/recuperar/[token]/page.tsx`

La tarea está bien si **todos** los errores caen en esa lista. Si aparece un error en
cualquier otro archivo, es algo que rompió este cambio y hay que arreglarlo antes de
commitear. Anotá en tu reporte la lista exacta de archivos con error.

- [ ] **Paso 7: commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260824120000_pedido_contrasena
git commit -m "feat(base): pedido de contraseña en lugar de token de reinicio

El autoservicio por correo no funciona: el remitente de prueba de Resend sólo
entrega a la casilla dueña de la API key, así que a los usuarios no les llega
nada. El pedido pasa a resolverlo el equipo SIED a mano, así que la tabla no
necesita token ni vencimiento: alcanza con quién pidió, cuándo, y si ya se
resolvió."
```

---

## Tarea 2: La librería de pedidos

**Archivos:**
- Crear: `src/lib/pedidos.ts`
- Test: `tests/pedidos.test.ts`

**Interfaces:**
- Consume: `prisma.pedidoContrasena` de la tarea 1.
- Produce:
  - `registrarPedido(email: string): Promise<{ id: number; nombre: string; email: string } | null>`
  - `sellarPedidos(usuarioId: number): Promise<void>`
  - `pedidosPendientes(): Promise<(PedidoContrasena & { usuario: Usuario })[]>`

- [ ] **Paso 1: escribir el test que falla**

Crear `tests/pedidos.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { registrarPedido, sellarPedidos, pedidosPendientes } from '@/lib/pedidos'

const ACTIVO = 'pedido.activo@ucc.edu.ar'
const BAJA = 'pedido.baja@ucc.edu.ar'
const OTRO = 'pedido.otro@ucc.edu.ar'

async function usuario(email: string, activo = true) {
  return prisma.usuario.upsert({
    where: { email },
    update: { activo },
    create: { email, nombre: `__TEST__ ${email}`, rol: 'consulta', activo },
  })
}

async function pendientesDe(usuarioId: number) {
  return prisma.pedidoContrasena.findMany({ where: { usuarioId, resuelto: null } })
}

describe('pedidos de contraseña', () => {
  beforeEach(async () => {
    // Los pedidos se borran en cascada al borrar el usuario.
    await prisma.usuario.deleteMany({ where: { email: { in: [ACTIVO, BAJA, OTRO] } } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { in: [ACTIVO, BAJA, OTRO] } } })
    await prisma.$disconnect()
  })

  it('registra el pedido de un usuario activo y devuelve a quién avisar', async () => {
    const u = await usuario(ACTIVO)
    const resultado = await registrarPedido(ACTIVO)

    expect(resultado).toEqual({ id: u.id, nombre: u.nombre, email: ACTIVO })
    expect(await pendientesDe(u.id)).toHaveLength(1)
  })

  it('normaliza el correo antes de buscarlo', async () => {
    const u = await usuario(ACTIVO)
    const resultado = await registrarPedido(`  ${ACTIVO.toUpperCase()} `)

    expect(resultado?.id).toBe(u.id)
  })

  it('no registra nada si el correo no existe, y no lo revela', async () => {
    const resultado = await registrarPedido('no.existe.en.absoluto@ucc.edu.ar')

    expect(resultado).toBeNull()
  })

  it('no registra nada si el usuario está dado de baja', async () => {
    const u = await usuario(BAJA, false)
    const resultado = await registrarPedido(BAJA)

    expect(resultado).toBeNull()
    expect(await pendientesDe(u.id)).toHaveLength(0)
  })

  it('pedir dos veces deja un solo pendiente, con la fecha actualizada', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    const [primero] = await pendientesDe(u.id)

    await registrarPedido(ACTIVO)
    const despues = await pendientesDe(u.id)

    expect(despues).toHaveLength(1)
    expect(despues[0].id).toBe(primero.id)
    expect(despues[0].creado.getTime()).toBeGreaterThanOrEqual(primero.creado.getTime())
  })

  it('un pedido resuelto no bloquea uno nuevo', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    await sellarPedidos(u.id)
    await registrarPedido(ACTIVO)

    expect(await pendientesDe(u.id)).toHaveLength(1)
    expect(await prisma.pedidoContrasena.count({ where: { usuarioId: u.id } })).toBe(2)
  })

  it('sellar cierra los pendientes de ese usuario y no los de otro', async () => {
    const uno = await usuario(ACTIVO)
    const otro = await usuario(OTRO)
    await registrarPedido(ACTIVO)
    await registrarPedido(OTRO)

    await sellarPedidos(uno.id)

    expect(await pendientesDe(uno.id)).toHaveLength(0)
    expect(await pendientesDe(otro.id)).toHaveLength(1)
  })

  it('sellar dos veces no rompe', async () => {
    const u = await usuario(ACTIVO)
    await registrarPedido(ACTIVO)
    await sellarPedidos(u.id)
    await sellarPedidos(u.id)

    expect(await pendientesDe(u.id)).toHaveLength(0)
  })

  it('lista los pendientes con su usuario, el más viejo primero', async () => {
    const uno = await usuario(ACTIVO)
    const otro = await usuario(OTRO)
    await registrarPedido(ACTIVO)
    await registrarPedido(OTRO)

    const lista = await pedidosPendientes()
    const mios = lista.filter((p) => [uno.id, otro.id].includes(p.usuarioId))

    expect(mios).toHaveLength(2)
    expect(mios[0].usuarioId).toBe(uno.id)
    expect(mios[0].usuario.email).toBe(ACTIVO)
  })
})
```

- [ ] **Paso 2: correr el test y ver que falla**

```bash
npx vitest run tests/pedidos.test.ts
```

Esperado: falla al importar, con un error del estilo
`Failed to resolve import "@/lib/pedidos"`.

- [ ] **Paso 3: escribir la implementación mínima**

Crear `src/lib/pedidos.ts`:

```ts
import { prisma } from './db'

/**
 * Registra un pedido de contraseña y devuelve a quién hay que avisarle, o
 * `null` cuando el correo no corresponde a nadie que pueda entrar.
 *
 * Quien llama tiene que responder lo mismo en los dos casos: si la pantalla
 * distinguiera, cualquiera podría averiguar qué direcciones están dadas de
 * alta probándolas de una en una.
 */
export async function registrarPedido(
  email: string,
): Promise<{ id: number; nombre: string; email: string } | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, nombre: true, email: true, activo: true },
  })
  if (!usuario || !usuario.activo) return null

  // Un solo pendiente por usuario: pedir de nuevo corre la fecha en lugar de
  // apilar filas, así la lista de /admin no se llena de repetidos ni se puede
  // inflar apretando el botón en repetición.
  const pendiente = await prisma.pedidoContrasena.findFirst({
    where: { usuarioId: usuario.id, resuelto: null },
  })

  if (pendiente) {
    await prisma.pedidoContrasena.update({
      where: { id: pendiente.id },
      data: { creado: new Date() },
    })
  } else {
    await prisma.pedidoContrasena.create({ data: { usuarioId: usuario.id } })
  }

  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
}

/**
 * Cierra los pedidos pendientes de alguien. Idempotente: se llama tanto al
 * fijarle una contraseña como al descartar el pedido a mano, y llamarla de
 * más no hace nada.
 */
export async function sellarPedidos(usuarioId: number): Promise<void> {
  await prisma.pedidoContrasena.updateMany({
    where: { usuarioId, resuelto: null },
    data: { resuelto: new Date() },
  })
}

/** Lo que ve administración: lo pendiente, lo que espera desde más tiempo primero. */
export async function pedidosPendientes() {
  return prisma.pedidoContrasena.findMany({
    where: { resuelto: null },
    include: { usuario: true },
    orderBy: { creado: 'asc' },
  })
}
```

- [ ] **Paso 4: correr el test y ver que pasa**

```bash
npx vitest run tests/pedidos.test.ts
```

Esperado: `9 passed`.

- [ ] **Paso 5: correr la suite entera**

> **Sobre la cobertura del spec.** El spec pide probar que `establecerContrasena` sella los
> pendientes de ese usuario y no los de otro, y que `descartarPedido` sella sin tocar la
> contraseña. Las dos son server actions: leen la sesión con `sesionActual()`, que necesita
> las cookies del pedido HTTP, y no se pueden invocar desde Vitest sin montar un request
> falso. Por eso la lógica que importa vive en `sellarPedidos`, que **sí** queda cubierta
> acá por los dos tests de sellado, y el cableado de las acciones se verifica a mano en el
> navegador en la tarea 4, paso 6. Si en algún momento se agrega infraestructura para
> testear acciones, esos dos casos son los primeros candidatos.

```bash
npm test
```

Esperado: todo en verde salvo `tests/tokens.test.ts`, que sigue pasando porque el módulo
todavía existe. Si falla algo más, arreglalo antes de commitear.

- [ ] **Paso 6: commit**

```bash
git add src/lib/pedidos.ts tests/pedidos.test.ts
git commit -m "feat: librería de pedidos de contraseña

Todo el acceso a la tabla pasa por acá, así las acciones quedan finas y la
lógica que importa —no revelar si el correo existe, y no apilar pedidos
repetidos del mismo usuario— se puede probar contra la base de test."
```

---

## Tarea 3: El pedido, el aviso y la limpieza del flujo viejo

**Archivos:**
- Reescribir: `src/lib/email.ts`
- Reescribir: `src/app/recuperar/actions.ts`
- Modificar: `src/app/recuperar/page.tsx`
- Modificar: `src/app/recuperar/FormRecuperar.tsx`
- Modificar: `src/app/ingresar/page.tsx:18` (mensaje `sin-contrasena`)
- Borrar: `src/app/recuperar/[token]/` completo, `src/lib/tokens.ts`, `tests/tokens.test.ts`

**Interfaces:**
- Consume: `registrarPedido` de la tarea 2.
- Produce:
  - `enviarAvisoPedido(nombre: string, email: string, linkAdmin: string): Promise<void>`
  - `emailActivo(): boolean` (se mantiene igual)
  - `solicitarPedido(prevState: EstadoPedido, formData: FormData): Promise<EstadoPedido>`
  - `type EstadoPedido = { error: string | null }`

- [ ] **Paso 1: reescribir `src/lib/email.ts`**

Contenido completo del archivo:

```ts
import { Resend } from 'resend'

/**
 * El único correo que manda el sistema va a la casilla del equipo SIED, que es
 * la dueña de la API key de Resend. Eso es lo que lo hace viable: el remitente
 * de prueba `onboarding@resend.dev` sólo entrega ahí, así que no hace falta
 * verificar el dominio institucional en DNS. Por eso el sistema no le escribe
 * a los usuarios: no les llegaría.
 */
const CASILLA_SIED = 'tecnologia.sied@ucc.edu.ar'

const REMITENTE =
  process.env.RESEND_FROM_EMAIL || 'Gestión de Asignaturas SIED <onboarding@resend.dev>'

export function emailActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/** El nombre lo tipeó una persona en /admin: puede traer < o &. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function enviarAvisoPedido(
  nombre: string,
  email: string,
  linkAdmin: string,
): Promise<void> {
  if (!emailActivo()) {
    throw new Error('El envío de correo no está configurado (falta RESEND_API_KEY)')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: CASILLA_SIED,
    subject: `Pedido de contraseña — ${nombre}`,
    html: `
      <p><strong>${escapar(nombre)}</strong> (${escapar(email)}) no puede entrar y pidió
      una contraseña nueva.</p>
      <p><a href="${escapar(linkAdmin)}">Resolverlo en Administración</a></p>
      <p>Fijale una contraseña ahí y avisale por fuera del sistema.</p>
    `,
  })
  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`)
}
```

- [ ] **Paso 2: reescribir `src/app/recuperar/actions.ts`**

Contenido completo del archivo:

```ts
'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { registrarPedido } from '@/lib/pedidos'
import { enviarAvisoPedido } from '@/lib/email'

export type EstadoPedido = { error: string | null }

async function origen() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${h.get('host')}`
}

/**
 * Deja el pedido y avisa al equipo SIED, que lo resuelve a mano.
 *
 * El aviso por correo es best-effort a propósito: el pedido ya quedó en la
 * base, que es lo que mira administración. Si Resend no está configurado o se
 * cae, el fallo va al log del servidor y no a la cara de alguien que no puede
 * hacer nada al respecto — antes veía el error crudo "falta RESEND_API_KEY" y
 * quedaba creyendo que no había pedido nada.
 *
 * Nunca revela si el correo existe: la pantalla dice lo mismo en los dos casos.
 */
export async function solicitarPedido(
  _prevState: EstadoPedido,
  formData: FormData,
): Promise<EstadoPedido> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) return { error: 'Ingresá tu correo' }

  const usuario = await registrarPedido(email)

  if (usuario) {
    try {
      await enviarAvisoPedido(usuario.nombre, usuario.email, `${await origen()}/admin`)
    } catch (e) {
      console.error('No se pudo avisar del pedido de contraseña:', e)
    }
  }

  redirect('/recuperar?enviado=1')
}
```

`redirect()` va fuera del `try`: por dentro funciona lanzando una excepción, y atraparla
cancelaría la navegación.

- [ ] **Paso 3: actualizar el formulario**

En `src/app/recuperar/FormRecuperar.tsx`, cambiar el import y el estado inicial:

```tsx
import { solicitarPedido, type EstadoPedido } from './actions'

const ESTADO_INICIAL: EstadoPedido = { error: null }

export function FormRecuperar() {
  const [estado, accion] = useActionState(solicitarPedido, ESTADO_INICIAL)
```

Y la etiqueta del botón, que ya no manda ningún link:

```tsx
      <Boton className="boton-principal" enCurso="Enviando">Pedir contraseña nueva</Boton>
```

- [ ] **Paso 4: actualizar los textos de la pantalla**

En `src/app/recuperar/page.tsx`, la firma pasa a recibir sólo `enviado`:

```tsx
export default async function Recuperar({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>
}) {
  const { enviado } = await searchParams
```

El bloque de confirmación:

```tsx
        {enviado ? (
          <>
            <p className="bajada-ingreso">
              Listo. Si ese correo está dado de alta, el equipo SIED ya tiene tu pedido y se
              va a poner en contacto para darte una contraseña nueva.
            </p>
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        ) : (
```

Y el bloque del formulario, sin la rama `vencido` y con el texto nuevo:

```tsx
          <>
            <p className="bajada-ingreso">
              Ingresá tu correo institucional y le avisamos al equipo SIED, que te va a
              cargar una contraseña nueva y te la va a pasar.
            </p>
            <FormRecuperar />
            <p className="nota-ingreso">
              <Link href="/ingresar">Volver a ingresar</Link>
            </p>
          </>
        )}
```

Al sacar la rama `vencido` queda sin usar el import `IconoAlerta`: borralo de la línea 2,
que pasa a ser `import { IconoCandado } from '@/components/iconos'`.

- [ ] **Paso 5: dar una salida al mensaje `sin-contrasena` del ingreso**

En `src/app/ingresar/page.tsx:18`, reemplazar:

```ts
  'sin-contrasena': 'Tu cuenta todavía no tiene contraseña definida. Pedile al equipo SIED que te la cargue en Administración.',
```

por:

```ts
  'sin-contrasena': 'Tu cuenta todavía no tiene contraseña definida. Pedila con el enlace "¿Olvidaste tu contraseña?" de abajo y el equipo SIED te la carga.',
```

El mensaje se renderiza como texto dentro de un `<span>`, así que no se le puede meter un
`<Link>` sin rehacer el diccionario `MENSAJES`. Apuntar al enlace que ya está en pantalla
alcanza y no agrega estructura.

- [ ] **Paso 6: borrar el flujo del token**

```bash
git rm -r "src/app/recuperar/[token]" src/lib/tokens.ts tests/tokens.test.ts
```

- [ ] **Paso 7: verificar que no quedó ninguna referencia**

```bash
npx tsc --noEmit
```

Esperado: sin salida.

```bash
grep -rn "tokenHash\|generarToken\|hashToken\|reinicioContrasena\|ReinicioContrasena\|enviarCorreoRecuperacion\|solicitarRecuperacion\|EstadoRecuperacion" src tests
```

Esperado: sin resultados.

- [ ] **Paso 8: correr la suite**

```bash
npm test
```

Esperado: todo en verde. Desaparecen los 2 tests de `tokens.test.ts` y siguen los 9 de
`pedidos.test.ts` que sumó la tarea 2.

- [ ] **Paso 9: probarlo en el navegador**

Levantar el dev server, abrir `/recuperar` y mandar un correo que **no** exista: tiene que
mostrar la confirmación igual. Después mandar uno que sí exista y esté activo, y comprobar
en la base que quedó la fila:

```bash
npx prisma studio
```

En `PedidoContrasena` tiene que haber una fila con `resuelto` vacío. En local el aviso por
correo va a fallar por falta de `RESEND_API_KEY`: en la consola del servidor tiene que
aparecer `No se pudo avisar del pedido de contraseña:` y en la pantalla, la confirmación
normal. Eso es exactamente el comportamiento buscado.

- [ ] **Paso 10: commit**

```bash
git add -A
git commit -m "feat: el pedido de contraseña va al equipo SIED, no al usuario

El sistema deja de mandarle correo a los usuarios —el remitente de prueba de
Resend no se los entrega— y le avisa a la casilla del SIED, que sí es la dueña
de la API key. El aviso es best-effort: el pedido queda registrado igual, así
que si el envío falla nadie pierde el pedido ni ve un error que no puede
resolver.

Se va el flujo del link con token, que no tenía forma de funcionar en
producción, y con él tokens.ts y su test."
```

---

## Tarea 4: Resolverlo desde Administración

**Archivos:**
- Modificar: `src/app/admin/actions.ts` (`establecerContrasena`, líneas 45-58; acción nueva al final)
- Modificar: `src/app/admin/page.tsx` (la consulta del `Promise.all` y la sección nueva)

**Interfaces:**
- Consume: `sellarPedidos` y `pedidosPendientes` de la tarea 2; `establecerContrasena` de
  `src/app/admin/actions.ts`, con la firma existente `(usuarioId: number, formData: FormData)`.
- Produce: `descartarPedido(pedidoId: number): Promise<void>`.

- [ ] **Paso 1: sellar los pendientes al fijar una contraseña**

En `src/app/admin/actions.ts`, agregar el import:

```ts
import { sellarPedidos } from '@/lib/pedidos'
```

Y en `establecerContrasena`, después del `update` del usuario:

```ts
  await prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: hashContrasena(contrasena) } })
  // Fijarle la contraseña ES resolver el pedido: si hubiera que marcarlo
  // aparte, la lista se llenaría de pedidos ya atendidos.
  await sellarPedidos(usuarioId)
  await anotar(admin.id, `${u.nombre}: se le definió una contraseña nueva`)
  revalidatePath('/admin')
```

- [ ] **Paso 2: agregar la acción de descartar**

Al final de `src/app/admin/actions.ts`:

```ts
/**
 * Cierra un pedido sin tocar la contraseña: para lo que no corresponda
 * atender, o cuando la persona ya se acomodó por otro lado.
 */
export async function descartarPedido(pedidoId: number) {
  const admin = await exigirAdmin()
  const pedido = await prisma.pedidoContrasena.findUnique({
    where: { id: pedidoId },
    include: { usuario: true },
  })
  if (!pedido) throw new Error('Pedido inexistente')

  await sellarPedidos(pedido.usuarioId)
  await anotar(admin.id, `${pedido.usuario.nombre}: se descartó el pedido de contraseña`)
  revalidatePath('/admin')
}
```

- [ ] **Paso 3: traer los pendientes en la página**

En `src/app/admin/page.tsx`, agregar los imports:

```ts
import { pedidosPendientes } from '@/lib/pedidos'
import {
  crearUsuario, cambiarRol, alternarActivo, asignarCarreras, asignarUnidad,
  establecerContrasena, descartarPedido,
} from './actions'
```

Y sumar la consulta al `Promise.all`, que pasa a devolver cinco cosas:

```ts
  const [usuarios, carreras, unidades, cambios, pedidos] = await Promise.all([
```

con `pedidosPendientes(),` como último elemento del arreglo, después de la consulta de
`prisma.cambio.findMany`.

- [ ] **Paso 4: renderizar la sección**

En `src/app/admin/page.tsx`, entre el `</div>` que cierra el `.encabezado` y el
`<h2>Dar de alta</h2>`:

```tsx
      {pedidos.length > 0 && (
        <>
          <h2>Pedidos de contraseña ({pedidos.length})</h2>
          <p className="sub">
            Gente que no puede entrar. Fijale una contraseña acá y pasásela por fuera del
            sistema: el pedido se cierra solo al guardarla.
          </p>
          <table>
            <thead>
              <tr>
                <th>Quién</th><th>Correo</th><th>Lo pidió</th>
                <th>Contraseña nueva</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.usuario.nombre}</td>
                  <td><small>{p.usuario.email}</small></td>
                  <td><small>{fmtFechaHora(p.creado)}</small></td>
                  <td>
                    <form action={establecerContrasena.bind(null, p.usuarioId)} className="en-linea">
                      <input
                        name="contrasena"
                        type="text"
                        placeholder="mínimo 8 caracteres"
                        required
                        minLength={8}
                        aria-label={`Contraseña nueva para ${p.usuario.nombre}`}
                      />
                      <Boton enCurso="Guardando">Guardar</Boton>
                    </form>
                  </td>
                  <td>
                    <form action={descartarPedido.bind(null, p.id)}>
                      <Boton className="quitar" enCurso="Descartando">Descartar</Boton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
```

`fmtFechaHora` ya está importado en el archivo y `Boton` también. El campo va en
`type="text"` a propósito, igual que el resto de `/admin`: administración le dicta la
contraseña a la persona, así que tiene que poder leerla. La regla de CSS que la muestra en
monoespaciada ya existe y aplica a `td input[name='contrasena']`.

- [ ] **Paso 5: verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin salida.

- [ ] **Paso 6: probarlo entero en el navegador**

Con el dev server levantado y una sesión de rol `admin`:

1. Ir a `/recuperar` y pedir una contraseña con el correo de un usuario activo.
2. Entrar a `/admin`: arriba tiene que aparecer **Pedidos de contraseña (1)** con esa
   persona y la fecha.
3. Escribir una contraseña de 8 caracteres o más y guardar. La sección tiene que
   desaparecer, y en **Últimos cambios de permisos** tienen que quedar dos líneas: la del
   pedido resuelto no, pero sí la de la contraseña nueva.
4. Cerrar sesión y entrar con ese usuario y esa contraseña.
5. Pedir de nuevo, y esta vez apretar **Descartar**: la sección desaparece y en la bitácora
   queda `se descartó el pedido de contraseña`.
6. Pedir dos veces seguidas con el mismo correo: en `/admin` tiene que haber **una** sola
   fila.

- [ ] **Paso 7: correr la suite**

```bash
npm test
```

Esperado: todo en verde.

- [ ] **Paso 8: verificar que compila para producción**

Parar el dev server antes, porque el build corre `prisma generate`:

```bash
npm run build
```

Esperado: `✓ Compiled successfully` y la lista de rutas **sin** `/recuperar/[token]`.

- [ ] **Paso 9: commit**

```bash
git add src/app/admin/actions.ts src/app/admin/page.tsx
git commit -m "feat(admin): lista de pedidos de contraseña pendientes

Arriba de todo y sólo cuando hay algo que atender: quién, cuándo lo pidió, el
campo para fijarle la contraseña y un botón para descartar. Fijar la contraseña
cierra el pedido solo, así resolver es un gesto y no dos."
```

---

## Después del plan

Antes de desplegar hay que revisar en Vercel que la variable `RESEND_API_KEY` esté cargada
para el entorno de producción. Sin ella el sistema sigue funcionando —el pedido queda en la
lista de `/admin`— pero no llega el aviso por correo, y nadie se entera hasta entrar a
mirar. `RESEND_FROM_EMAIL` puede quedar sin definir: el remitente de prueba alcanza,
justamente porque el destinatario es la casilla dueña de la API key.

La migración se aplica sola en el deploy: el `buildCommand` de `vercel.json` ya corre
`prisma migrate deploy`.
