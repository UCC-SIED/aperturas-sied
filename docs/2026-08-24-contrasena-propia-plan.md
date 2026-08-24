# Cada persona, dueña de su contraseña — plan de implementación

> **Para quien lo ejecute:** usar `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ir tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** que la contraseña de cada persona la sepa solamente esa persona: el sistema
genera una provisoria por persona, quien entra elige la suya al primer ingreso, y desde su
perfil puede cambiarla cuando quiera.

**Arquitectura:** la lógica de datos vive en `src/lib/credenciales.ts` y se prueba contra
la base de test. El cumplimiento no va en el layout raíz —los layouts no se reejecutan al
navegar— sino en dos funciones hermanas de `src/lib/sesion.ts`: `exigirSesion()` redirige,
para las pantallas, y `exigirSesionActiva()` lanza, para las server actions.

**Stack:** Next 16 (App Router, server actions), Prisma 6, PostgreSQL en producción y
SQLite en desarrollo y tests, Vitest.

Diseño aprobado: [docs/2026-08-24-contrasena-propia-design.md](2026-08-24-contrasena-propia-design.md)

## Restricciones globales

- **Todo en castellano rioplatense**: nombres de funciones, variables, comentarios, textos
  de pantalla y mensajes de commit. Es la convención del repo entero, sin excepciones.
- **Los comentarios explican por qué, no qué.** Mirá los que ya hay en `src/lib/` como
  referencia de tono y de largo.
- **Errores esperados como valor de retorno, nunca `throw`**, en toda acción que alimente
  un `useActionState`: en producción Next 16 no deja pasar el mensaje de una excepción al
  cliente. Las acciones de `/admin`, `/periodos`, `/planificar`, `/produccion` y
  `/asignaturas` sí usan `throw` porque las recoge `src/app/error.tsx`.
- **`redirect()` de Next funciona lanzando una excepción**: nunca va dentro de un
  `try/catch`, y en una acción va **después** de todo lo que pueda devolver un error.
- **Longitud mínima de contraseña: 8 caracteres.** Hoy está como `CONTRASENA_MINIMA` en
  `src/app/admin/actions.ts`; la tarea 2 la muda a `src/lib/credenciales.ts` y el resto la
  importa de ahí. **No duplicar el número en ningún lado.**
- **`prisma generate` falla en Windows si el servidor de desarrollo está corriendo**
  (`EPERM ... query_engine-windows.dll.node`). Pará el dev server antes de regenerar.
- **El `provider` de `prisma/schema.prisma` tiene que quedar en `sqlite`** para trabajar en
  local (`npm run db:local`). No commitearlo apuntando a `postgresql`.
- **Las migraciones versionadas se escriben para PostgreSQL** (`migration_lock.toml` dice
  `postgresql`). En local el esquema se aplica con `prisma db push`, nunca `migrate dev`.
- **Nunca imprimir ni loguear una contraseña en texto plano**, ni la provisoria generada.
  La provisoria se devuelve a la pantalla de `/admin` y nada más: no viaja en la URL.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `prisma/schema.prisma` | Campo `debeElegirContrasena` en `Usuario` | 1 |
| `prisma/migrations/20260824180000_contrasena_propia/migration.sql` | `ADD COLUMN` con default `true` | 1 |
| `src/lib/permisos.ts` | El campo entra al tipo `Sesion` | 1 |
| `src/lib/sesion.ts` | `exigirSesion()` y `exigirSesionActiva()` | 1 |
| `src/lib/credenciales.ts` | **Nuevo.** Generar la provisoria, elegir la primera, cambiar la propia | 2 |
| `tests/credenciales.test.ts` | **Nuevo.** Pruebas de esa librería | 2 |
| `src/app/elegir-contrasena/` | **Nuevo.** Pantalla del primer ingreso (page, form, action) | 3 |
| Las 10 pantallas + `page.tsx` + `exportar/route.ts` | Pasan a `exigirSesion()` | 3 |
| `src/components/Marco.tsx` | `/elegir-contrasena` se muestra sola | 3 |
| `tests/guardias.test.ts` | **Nuevo.** Que ninguna pantalla quede sin guardia | 3 |
| Los 6 módulos de `actions.ts` | Pasan a `exigirSesionActiva()` | 4 |
| `src/app/perfil/` | **Nuevo.** Cambiar la contraseña propia (page, form, action) | 5 |
| `src/app/layout.tsx` | El nombre de la barra enlaza al perfil | 5 |
| `src/app/admin/FormAlta.tsx` | **Nuevo.** El alta muestra la provisoria | 6 |
| `src/app/admin/actions.ts` | `crearUsuario` devuelve la provisoria; `establecerContrasena` vuelve a marcar | 6 |
| `src/app/globals.css` | Estilo del cartel de la provisoria | 6 |

---

## Tarea 1: El campo y las dos funciones de guardia

**Archivos:**
- Modificar: `prisma/schema.prisma` (modelo `Usuario`, líneas 34-49)
- Crear: `prisma/migrations/20260824180000_contrasena_propia/migration.sql`
- Modificar: `src/lib/permisos.ts` (tipo `Sesion`, líneas 1-7)
- Modificar: `src/lib/sesion.ts`
- Test: `tests/credenciales.test.ts` (sólo el primer caso; el resto lo agrega la tarea 2)

**Interfaces:**
- Consume: nada.
- Produce: el campo `debeElegirContrasena: boolean` en el modelo `Usuario` y en el tipo
  `Sesion`; `exigirSesion(): Promise<Sesion>` que redirige; `exigirSesionActiva():
  Promise<Sesion>` que lanza.

- [ ] **Paso 1: asegurarse de que el esquema apunte a SQLite**

```bash
npm run db:local
```

Esperado: `schema.prisma ya está en sqlite` o `schema.prisma: postgresql -> sqlite`.

- [ ] **Paso 2: agregar el campo al esquema**

En `prisma/schema.prisma`, reemplazar el bloque entero del modelo `Usuario` por este. Se
realinea la columna de nombres porque `debeElegirContrasena` es más largo que todos los
que había:

```prisma
model Usuario {
  id                   Int                @id @default(autoincrement())
  email                String             @unique
  nombre               String
  rol                  String             @default("consulta")
  activo               Boolean            @default(true)
  /// Hash con sal (scrypt), nunca la contraseña en texto plano. Null hasta
  /// que administración le defina una.
  passwordHash         String?
  /// Mientras esté en true, la persona no puede usar el sistema hasta elegir
  /// una contraseña propia. Arranca en true porque la provisoria del alta la
  /// conoce administración: tiene que dejar de servir en cuanto entre.
  debeElegirContrasena Boolean            @default(true)
  /// Sólo para rol "unidad": qué unidad académica planifica entera.
  unidadId             String?
  unidad               Unidad?            @relation(fields: [unidadId], references: [id])
  carreras             UsuarioCarrera[]
  cambios              Cambio[]
  pedidosContrasena    PedidoContrasena[]
}
```

- [ ] **Paso 3: escribir la migración para PostgreSQL**

Crear `prisma/migrations/20260824180000_contrasena_propia/migration.sql`:

```sql
-- AlterTable
-- El DEFAULT true deja marcados a los usuarios que ya existen: la contraseña
-- que usan hoy la definió administración, así que también la tienen que
-- reemplazar. No hace falta ningún backfill aparte.
ALTER TABLE "Usuario" ADD COLUMN "debeElegirContrasena" BOOLEAN NOT NULL DEFAULT true;
```

- [ ] **Paso 4: parar el dev server, regenerar y aplicar**

Si hay un `next dev` corriendo, pararlo: en Windows `prisma generate` no puede reemplazar
el `.dll` mientras el proceso lo tiene abierto.

```bash
npx prisma generate && npx prisma db push
```

Esperado: `✔ Generated Prisma Client` y `Your database is now in sync with your Prisma schema.`

- [ ] **Paso 5: sumar el campo al tipo `Sesion`**

En `src/lib/permisos.ts`, reemplazar:

```ts
export type Sesion = {
  id: number
  nombre: string
  email: string
  rol: string
  carreraIds: number[]
}
```

por:

```ts
export type Sesion = {
  id: number
  nombre: string
  email: string
  rol: string
  carreraIds: number[]
  /** Mientras sea true, sólo puede pasar por /elegir-contrasena. */
  debeElegirContrasena: boolean
}
```

- [ ] **Paso 6: poblarlo y agregar las dos guardias**

En `src/lib/sesion.ts`, agregar `redirect` al import de `next/navigation` —el archivo hoy
no lo importa, así que la línea nueva va arriba, junto a los otros imports:

```ts
import { redirect } from 'next/navigation'
```

En el objeto que devuelve `sesionActual()`, agregar el campo:

```ts
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    carreraIds,
    debeElegirContrasena: u.debeElegirContrasena,
  }
```

Y al final del archivo, las dos funciones:

```ts
/**
 * La sesión de alguien que puede usar el sistema. Si no puede, no vuelve.
 *
 * El chequeo va acá y no en el layout raíz a propósito: los layouts del App
 * Router no se reejecutan al navegar del lado del cliente, así que un guardia
 * ahí no correría en cada cambio de ruta. Ver la guía de autenticación de Next
 * en node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export async function exigirSesion(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (s.debeElegirContrasena) redirect('/elegir-contrasena')
  return s
}

/**
 * Lo mismo para usar dentro de una server action, que se puede disparar sin
 * pasar por ninguna pantalla. Lanza en vez de redirigir, que es el patrón de
 * las acciones de este proyecto: las recoge src/app/error.tsx.
 */
export async function exigirSesionActiva(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) throw new Error('Tenés que ingresar de nuevo')
  if (s.debeElegirContrasena) {
    throw new Error('Antes de seguir tenés que elegir una contraseña propia')
  }
  return s
}
```

- [ ] **Paso 7: escribir el test del valor por defecto**

Crear `tests/credenciales.test.ts` con este contenido inicial:

```ts
import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

const EMAIL = 'credenciales.test@ucc.edu.ar'

describe('marca de contraseña por elegir', () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('un usuario nuevo arranca con la marca puesta', async () => {
    const u = await prisma.usuario.create({
      data: { email: EMAIL, nombre: '__TEST__', rol: 'consulta' },
    })
    expect(u.debeElegirContrasena).toBe(true)
  })
})
```

- [ ] **Paso 8: correr el test y la suite**

```bash
npx vitest run tests/credenciales.test.ts
```

Esperado: `1 passed`.

```bash
npm test && npx tsc --noEmit
```

Esperado: toda la suite en verde y `tsc` sin salida. Todavía nada hace cumplir la marca:
la app sigue funcionando igual.

- [ ] **Paso 9: commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260824180000_contrasena_propia src/lib/permisos.ts src/lib/sesion.ts tests/credenciales.test.ts
git commit -m "feat(base): marca de contraseña por elegir, y las dos guardias de sesión

El campo arranca en true, así que también quedan marcados los usuarios que ya
existen: la contraseña que usan hoy la definió administración.

Las guardias van al lado de sesionActual() y no en el layout raíz: los layouts
del App Router no se reejecutan al navegar, así que un chequeo ahí no correría
en cada cambio de ruta."
```

---

## Tarea 2: La librería de credenciales

**Archivos:**
- Crear: `src/lib/credenciales.ts`
- Modificar: `src/app/admin/actions.ts` (sacar la constante `CONTRASENA_MINIMA` e importarla)
- Test: `tests/credenciales.test.ts` (agregar casos al archivo que creó la tarea 1)

**Interfaces:**
- Consume: el campo `debeElegirContrasena` de la tarea 1; `hashContrasena` y
  `verificarContrasena` de `src/lib/contrasenas.ts`.
- Produce:
  - `CONTRASENA_MINIMA: number` (vale 8)
  - `generarProvisoria(): string`
  - `elegirPrimeraContrasena(usuarioId: number, nueva: string): Promise<{ error: string | null }>`
  - `cambiarContrasenaPropia(usuarioId: number, actual: string, nueva: string): Promise<{ error: string | null }>`

- [ ] **Paso 1: escribir los tests que fallan**

Reemplazar el contenido de `tests/credenciales.test.ts` por este:

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { verificarContrasena, hashContrasena } from '@/lib/contrasenas'
import {
  CONTRASENA_MINIMA,
  generarProvisoria,
  elegirPrimeraContrasena,
  cambiarContrasenaPropia,
} from '@/lib/credenciales'

const EMAIL = 'credenciales.test@ucc.edu.ar'
const ACTUAL = 'la-de-antes-2026'

async function usuario(passwordHash: string | null = hashContrasena(ACTUAL)) {
  return prisma.usuario.create({
    data: { email: EMAIL, nombre: '__TEST__', rol: 'consulta', passwordHash },
  })
}

async function leer(id: number) {
  return prisma.usuario.findUniqueOrThrow({ where: { id } })
}

describe('provisoria generada', () => {
  it('tiene el formato palabra-palabra-palabra-NNN', () => {
    expect(generarProvisoria()).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{3}$/)
  })

  // Sin tildes ni ñ: se dicta por teléfono y se tipea en cualquier teclado.
  it('no trae tildes ni ñ', () => {
    for (let i = 0; i < 50; i++) {
      expect(generarProvisoria()).not.toMatch(/[áéíóúüñ]/)
    }
  })

  it('dos llamadas seguidas no coinciden', () => {
    expect(generarProvisoria()).not.toBe(generarProvisoria())
  })

  it('es más larga que el mínimo exigido', () => {
    expect(generarProvisoria().length).toBeGreaterThanOrEqual(CONTRASENA_MINIMA)
  })
})

describe('elegir la primera contraseña', () => {
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('guarda el hash, baja la marca y anota en la bitácora', async () => {
    const u = await usuario()
    const { error } = await elegirPrimeraContrasena(u.id, 'la-mia-propia-2026')

    expect(error).toBeNull()
    const despues = await leer(u.id)
    expect(despues.debeElegirContrasena).toBe(false)
    expect(verificarContrasena('la-mia-propia-2026', despues.passwordHash)).toBe(true)

    const anotado = await prisma.cambio.findFirst({
      where: { usuarioId: u.id },
      orderBy: { fecha: 'desc' },
    })
    expect(anotado?.detalle).toContain('__TEST__')
  })

  it('rechaza una contraseña corta sin tocar la base', async () => {
    const u = await usuario()
    const { error } = await elegirPrimeraContrasena(u.id, 'corta')

    expect(error).toContain(String(CONTRASENA_MINIMA))
    const despues = await leer(u.id)
    expect(despues.debeElegirContrasena).toBe(true)
    expect(verificarContrasena(ACTUAL, despues.passwordHash)).toBe(true)
  })

  it('no explota si el usuario no existe', async () => {
    const { error } = await elegirPrimeraContrasena(999999, 'la-mia-propia-2026')
    expect(error).toBeTruthy()
  })
})

describe('cambiar la contraseña propia', () => {
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } })
    await prisma.$disconnect()
  })

  it('funciona si la actual coincide', async () => {
    const u = await usuario()
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'la-nueva-mia-2026')

    expect(error).toBeNull()
    const despues = await leer(u.id)
    expect(verificarContrasena('la-nueva-mia-2026', despues.passwordHash)).toBe(true)
    expect(despues.debeElegirContrasena).toBe(false)
  })

  // Lo que evita que alguien que encuentre una sesión abierta se apropie de la cuenta.
  it('falla si la actual no coincide, y no toca el hash guardado', async () => {
    const u = await usuario()
    const antes = (await leer(u.id)).passwordHash
    const { error } = await cambiarContrasenaPropia(u.id, 'no-es-esta', 'la-nueva-mia-2026')

    expect(error).toBeTruthy()
    expect((await leer(u.id)).passwordHash).toBe(antes)
  })

  it('falla si el usuario no tiene contraseña definida', async () => {
    const u = await usuario(null)
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'la-nueva-mia-2026')
    expect(error).toBeTruthy()
  })

  it('rechaza una contraseña corta sin tocar la base', async () => {
    const u = await usuario()
    const { error } = await cambiarContrasenaPropia(u.id, ACTUAL, 'corta')

    expect(error).toContain(String(CONTRASENA_MINIMA))
    expect(verificarContrasena(ACTUAL, (await leer(u.id)).passwordHash)).toBe(true)
  })
})
```

- [ ] **Paso 2: correr los tests y ver que fallan**

```bash
npx vitest run tests/credenciales.test.ts
```

Esperado: falla al importar, con `Failed to resolve import "@/lib/credenciales"`.

- [ ] **Paso 3: escribir la implementación**

Crear `src/lib/credenciales.ts`:

```ts
import { randomInt } from 'crypto'
import { prisma } from './db'
import { hashContrasena, verificarContrasena } from './contrasenas'

export const CONTRASENA_MINIMA = 8

/**
 * Palabras cortas y sin tildes ni ñ: la provisoria se dicta por teléfono y se
 * tipea en cualquier teclado, incluido uno mal configurado.
 */
const PALABRAS = [
  'agua', 'aire', 'alga', 'ancla', 'arbol', 'arena', 'aula', 'avena',
  'bahia', 'balsa', 'banco', 'barco', 'bosque', 'brisa', 'brote', 'buho',
  'cabo', 'calle', 'campo', 'canto', 'casa', 'cedro', 'cielo', 'cima',
  'clavo', 'cobre', 'coral', 'costa', 'cuadro', 'cueva', 'dedo', 'delta',
  'duna', 'faro', 'fibra', 'flor', 'foco', 'fuego', 'fuente', 'gota',
  'grano', 'hielo', 'hoja', 'hongo', 'humo', 'isla', 'jarra', 'lago',
  'lampara', 'lanza', 'laurel', 'leon', 'lima', 'limon', 'lirio', 'llave',
  'lluvia', 'loma', 'luna', 'lupa', 'maiz', 'manto', 'mapa', 'mesa',
  'miel', 'monte', 'mora', 'musgo', 'nido', 'niebla', 'nieve', 'nogal',
  'nube', 'nuez', 'olivo', 'olmo', 'onda', 'oro', 'paja', 'palma',
  'papel', 'pato', 'pera', 'pino', 'pluma', 'pozo', 'prado', 'puente',
  'puerto', 'rama', 'remo', 'rio', 'roble', 'roca', 'sal', 'sauce',
  'selva', 'sierra', 'silla', 'sol', 'tela', 'tierra', 'tigre', 'torre',
  'trigo', 'valle', 'vela', 'viento',
]

/**
 * Contraseña de un solo uso para el alta. Se genera con `randomInt` del módulo
 * nativo y no con Math.random: es la que protege la cuenta hasta que la persona
 * entre por primera vez.
 */
export function generarProvisoria(): string {
  const palabras = Array.from({ length: 3 }, () => PALABRAS[randomInt(PALABRAS.length)])
  return `${palabras.join('-')}-${randomInt(100, 1000)}`
}

type Resultado = { error: string | null }

/** Lo común de los dos caminos: validar el largo, guardar el hash y anotar. */
async function guardar(usuarioId: number, nueva: string, queHizo: string): Promise<Resultado> {
  if (nueva.length < CONTRASENA_MINIMA) {
    return { error: `La contraseña tiene que tener al menos ${CONTRASENA_MINIMA} caracteres` }
  }

  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) return { error: 'No encontramos tu usuario. Volvé a ingresar.' }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { passwordHash: hashContrasena(nueva), debeElegirContrasena: false },
  })

  // Un cambio de credenciales tiene que quedar rastreable, igual que los que
  // hace administración desde /admin.
  await prisma.cambio.create({
    data: { usuarioId, accion: 'gestion_usuarios', detalle: `${u.nombre}: ${queHizo}` },
  })

  return { error: null }
}

/** Primer ingreso: no se pide la anterior porque la acaba de usar para entrar. */
export async function elegirPrimeraContrasena(usuarioId: number, nueva: string): Promise<Resultado> {
  return guardar(usuarioId, nueva, 'eligió su contraseña al primer ingreso')
}

/**
 * Cambio desde el perfil. Pedir la actual es lo que evita que alguien que
 * encuentre una sesión abierta se apropie de la cuenta.
 */
export async function cambiarContrasenaPropia(
  usuarioId: number,
  actual: string,
  nueva: string,
): Promise<Resultado> {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) return { error: 'No encontramos tu usuario. Volvé a ingresar.' }
  if (!verificarContrasena(actual, u.passwordHash)) {
    return { error: 'La contraseña actual no coincide' }
  }
  return guardar(usuarioId, nueva, 'cambió su contraseña desde su perfil')
}
```

- [ ] **Paso 4: correr los tests y ver que pasan**

```bash
npx vitest run tests/credenciales.test.ts
```

Esperado: `11 passed`.

- [ ] **Paso 5: mudar la constante para no tenerla dos veces**

En `src/app/admin/actions.ts`, borrar esta línea:

```ts
const CONTRASENA_MINIMA = 8
```

y agregar el import:

```ts
import { CONTRASENA_MINIMA } from '@/lib/credenciales'
```

- [ ] **Paso 6: verificar y commitear**

```bash
npx tsc --noEmit && npm test
```

Esperado: `tsc` sin salida y toda la suite en verde.

```bash
git add src/lib/credenciales.ts tests/credenciales.test.ts src/app/admin/actions.ts
git commit -m "feat: librería de credenciales

Genera la provisoria del alta y escribe las contraseñas que elige cada persona,
bajando la marca y anotando en la bitácora. La validación de largo mínimo queda
en un solo lugar: /admin la importa de acá en vez de tener su propia constante."
```

---

## Tarea 3: El primer ingreso, y los guardias de las pantallas

**Archivos:**
- Crear: `src/app/elegir-contrasena/page.tsx`, `src/app/elegir-contrasena/FormElegir.tsx`,
  `src/app/elegir-contrasena/actions.ts`
- Modificar: `src/app/page.tsx:7-8`, `src/app/panel/page.tsx:16-17`,
  `src/app/planificar/page.tsx:30-31`, `src/app/periodos/page.tsx:30-31`,
  `src/app/periodos/[id]/page.tsx:33-34`, `src/app/asignaturas/page.tsx:15-16`,
  `src/app/asignaturas/[codigo]/page.tsx:26-27`, `src/app/produccion/page.tsx:27-28`,
  `src/app/preparar/page.tsx:19-20`, `src/app/admin/page.tsx:18-19`,
  `src/app/exportar/route.ts`
- Modificar: `src/components/Marco.tsx` (la lista `SIN_MARCO`)
- Test: `tests/guardias.test.ts`

**Interfaces:**
- Consume: `exigirSesion()` de la tarea 1; `elegirPrimeraContrasena()` de la tarea 2; los
  componentes `Boton`, `CampoContrasena` e `IconoCandado`, que ya existen.
- Produce: la ruta `/elegir-contrasena`, y todas las pantallas usando `exigirSesion()`.

- [ ] **Paso 1: crear la acción de la pantalla**

Crear `src/app/elegir-contrasena/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'
import { elegirPrimeraContrasena } from '@/lib/credenciales'

export type EstadoElegir = { error: string | null }

/**
 * Usa sesionActual() y no exigirSesion(): exigirSesion redirige justamente acá,
 * así que se llamaría a sí misma en un bucle.
 */
export async function elegir(
  _prevState: EstadoElegir,
  formData: FormData,
): Promise<EstadoElegir> {
  const s = await sesionActual()
  if (!s) redirect('/ingresar')

  const nueva = String(formData.get('contrasena') ?? '')
  const repetir = String(formData.get('repetir') ?? '')
  if (nueva !== repetir) return { error: 'Las dos contraseñas no coinciden' }

  const { error } = await elegirPrimeraContrasena(s.id, nueva)
  if (error) return { error }

  redirect('/')
}
```

- [ ] **Paso 2: crear el formulario**

Crear `src/app/elegir-contrasena/FormElegir.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoAlerta } from '@/components/iconos'
import { elegir, type EstadoElegir } from './actions'

const ESTADO_INICIAL: EstadoElegir = { error: null }

export function FormElegir() {
  const [estado, accion] = useActionState(elegir, ESTADO_INICIAL)

  return (
    <form action={accion} className="form-ingreso">
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      <CampoContrasena
        id="contrasena"
        name="contrasena"
        label="Contraseña nueva"
        autoComplete="new-password"
      />
      <CampoContrasena
        id="repetir"
        name="repetir"
        label="Repetila"
        autoComplete="new-password"
      />
      <Boton className="boton-principal" enCurso="Guardando">Guardar y entrar</Boton>
    </form>
  )
}
```

- [ ] **Paso 3: crear la pantalla**

Crear `src/app/elegir-contrasena/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { sesionActual } from '@/lib/sesion'
import { IconoCandado } from '@/components/iconos'
import { FormElegir } from './FormElegir'

export const metadata = { title: 'Elegí tu contraseña' }

export const dynamic = 'force-dynamic'

export default async function ElegirContrasena() {
  // sesionActual() y no exigirSesion(): esta es la pantalla a la que
  // exigirSesion redirige, así que usarla acá sería un bucle.
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
  if (!s.debeElegirContrasena) redirect('/')

  return (
    <main className="pantalla-ingreso">
      <div className="tarjeta-ingreso">
        <div className="marca-ingreso">
          <span className="sello-ingreso" aria-hidden>
            <IconoCandado />
          </span>
          <div>
            <p className="eyebrow">SIED · Universidad Católica de Córdoba</p>
            <h1>Elegí tu contraseña</h1>
          </div>
        </div>

        <p className="bajada-ingreso">
          Hola {s.nombre}. La contraseña con la que entraste la generó el sistema y la
          conoce el equipo SIED, así que sirve una sola vez. Elegí una propia: va a ser la
          única que funcione de acá en adelante, y nadie más la va a saber.
        </p>

        <FormElegir />
      </div>
    </main>
  )
}
```

- [ ] **Paso 4: que la pantalla se muestre sola**

En `src/components/Marco.tsx`, cambiar:

```ts
const SIN_MARCO = ['/ingresar', '/recuperar']
```

por:

```ts
const SIN_MARCO = ['/ingresar', '/recuperar', '/elegir-contrasena']
```

- [ ] **Paso 5: cambiar el guardia en las 10 pantallas**

En cada uno de estos archivos, reemplazar estas dos líneas:

```ts
  const s = await sesionActual()
  if (!s) redirect('/ingresar')
```

por esta:

```ts
  const s = await exigirSesion()
```

y en el import de `@/lib/sesion` de cada archivo, cambiar `sesionActual` por
`exigirSesion`. Los archivos son:

1. `src/app/page.tsx`
2. `src/app/panel/page.tsx`
3. `src/app/planificar/page.tsx`
4. `src/app/periodos/page.tsx`
5. `src/app/periodos/[id]/page.tsx`
6. `src/app/asignaturas/page.tsx`
7. `src/app/asignaturas/[codigo]/page.tsx`
8. `src/app/produccion/page.tsx`
9. `src/app/preparar/page.tsx`
10. `src/app/admin/page.tsx`

**Ojo con dos cosas.** Algunos archivos importan también otras cosas del mismo módulo
(`googleActivo`, por ejemplo): dejalas. Y varios usan `redirect` más abajo para otra cosa
(`redirect('/panel')` cuando falta un permiso): **no borres ese import**, sólo se va la
línea del guardia. Si al terminar `tsc` se queja de que `redirect` no se usa en algún
archivo, ahí sí sacá el import de ese archivo.

- [ ] **Paso 6: el mismo guardia en la descarga de la planilla**

En `src/app/exportar/route.ts` (línea 4), cambiar el import de `sesionActual` por
`exigirSesion`, y reemplazar estas dos líneas (15-16):

```ts
  const s = await sesionActual()
  if (!s) return new NextResponse('Iniciá sesión', { status: 401 })
```

por esta:

```ts
  const s = await exigirSesion()
```

Un usuario que todavía no eligió su contraseña no debería poder bajarse la planilla
entera. Se pierde el 401 y en su lugar hay una redirección al ingreso, que es lo que
recibe cualquiera que abra la URL sin sesión: para una descarga que se dispara desde un
enlace de la propia app, es mejor que un texto crudo en el navegador. Si `tsc` marca que
`NextResponse` quedó sin usar, dejalo: el archivo lo usa más abajo para devolver el
archivo.

- [ ] **Paso 7: escribir el test que impide olvidarse una pantalla**

Crear `tests/guardias.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

const APP = path.resolve(__dirname, '../src/app')

/** Pantallas de antes de tener sesión: no pueden exigirla. */
const SIN_SESION = ['ingresar', 'recuperar', 'elegir-contrasena']

function paginas(dir: string): string[] {
  const encontradas: string[] = []
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada)
    if (statSync(completo).isDirectory()) {
      if (SIN_SESION.includes(entrada) || entrada === 'api') continue
      encontradas.push(...paginas(completo))
    } else if (entrada === 'page.tsx') {
      encontradas.push(completo)
    }
  }
  return encontradas
}

describe('guardias de sesión', () => {
  // Sin esto, una pantalla nueva puede quedar sin guardia y nadie se entera
  // hasta que alguien entra sin haber elegido su contraseña.
  it('toda pantalla autenticada usa exigirSesion()', () => {
    const encontradas = paginas(APP)
    expect(encontradas.length).toBeGreaterThanOrEqual(10)

    const sinGuardia = encontradas.filter(
      (p) => !readFileSync(p, 'utf8').includes('exigirSesion('),
    )
    expect(sinGuardia.map((p) => path.relative(APP, p))).toEqual([])
  })
})
```

- [ ] **Paso 8: verificar**

```bash
npx vitest run tests/guardias.test.ts
```

Esperado: `1 passed`.

```bash
npx tsc --noEmit && npm test
```

Esperado: `tsc` sin salida y toda la suite en verde.

- [ ] **Paso 9: probarlo en el navegador**

Levantar el dev server. **Tu propio usuario de prueba ya está marcado** —la tarea 1 dejó a
todos en `true`—, así que:

1. Entrá con tu usuario. Tiene que llevarte a `/elegir-contrasena`, sin la barra azul.
2. Probá poner dos contraseñas distintas: tiene que decir que no coinciden.
3. Probá una de menos de 8: tiene que decir el mínimo.
4. Poné una válida dos veces: tiene que entrar al panel.
5. Navegá por las demás pantallas: ya no te tiene que volver a pedir nada.
6. En la base, con `npx prisma studio`, comprobá que tu usuario quedó en
   `debeElegirContrasena: false`.
7. Marcá tu usuario a mano en `true` desde Prisma Studio y, **sin volver a ingresar**,
   hacé clic en cualquier enlace de la barra: tiene que mandarte a `/elegir-contrasena`.
   Eso es lo que prueba que el guardia corre en cada navegación y no sólo al ingresar.

- [ ] **Paso 10: commit**

```bash
git add -A
git commit -m "feat: cada persona elige su contraseña al primer ingreso

La pantalla se muestra sola, sin la barra de navegación, porque estando marcado
todos sus enlaces rebotan acá.

El guardia reemplaza el par sesionActual()+redirect que estaba repetido en las
10 pantallas, así que es menos código que antes. Y un test recorre src/app y
falla si alguna pantalla queda sin guardia: es lo que evita que dentro de seis
meses se agregue una nueva y nadie se entere."
```

---

## Tarea 4: Los guardias de las server actions

**Archivos:**
- Modificar: `src/app/admin/actions.ts` (dentro de `exigirAdmin`, líneas 12-16)
- Modificar: `src/app/periodos/actions.ts` (dentro de `exigirPermiso`, líneas 20-25)
- Modificar: `src/app/periodos/[id]/actions.ts` (2 lugares: líneas 26 y 74)
- Modificar: `src/app/planificar/actions.ts` (6 lugares: líneas 11, 21, 27, 40, 77, 94)
- Modificar: `src/app/asignaturas/[codigo]/actions.ts` (línea 11)
- Modificar: `src/app/produccion/actions.ts` (línea 14)

**Interfaces:**
- Consume: `exigirSesionActiva()` de la tarea 1.
- Produce: nada nuevo. Cierra el camino de disparar una acción sin pasar por una pantalla.

- [ ] **Paso 1: reemplazar en los seis módulos**

En cada archivo, cambiar el import de `sesionActual` por `exigirSesionActiva` (si el
archivo usa las dos cosas, importá las dos) y reemplazar cada

```ts
  const s = await sesionActual()
```

por

```ts
  const s = await exigirSesionActiva()
```

Detalle importante: `exigirSesionActiva()` devuelve `Sesion`, no `Sesion | null`. Donde
había `return s!` —como al final de `exigirPermiso` en `src/app/periodos/actions.ts`— el
`!` **sobra y hay que sacarlo**, porque `tsc` lo va a marcar. Lo mismo con cualquier `s!`
más abajo en esos archivos.

`src/app/recuperar/actions.ts` **no se toca**: la usa gente que todavía no ingresó.

> **Sobre la cobertura del spec.** El spec pide probar que `establecerContrasena` vuelve a
> poner la marca en true. Es una server action: lee la sesión con `sesionActual()`, que
> necesita las cookies del pedido HTTP, y no se puede invocar desde Vitest sin montar un
> request falso. La tarea 6 la implementa y la verifica a mano en el navegador (paso 7,
> punto 6). Lo mismo vale para las acciones de esta tarea: lo que se puede probar sin
> navegador es `exigirSesionActiva()` a través de su efecto, y eso se ve en el paso 3.

- [ ] **Paso 2: verificar tipos y suite**

```bash
npx tsc --noEmit && npm test
```

Esperado: `tsc` sin salida y toda la suite en verde. Si `tsc` marca un `s!` sobrante,
sacalo: es exactamente lo que se esperaba.

- [ ] **Paso 3: probar que la acción corta de verdad**

Con el dev server levantado y tu usuario **sin** marca:

1. Abrí `/produccion`, cambiá un estado pero **no** guardes todavía.
2. Desde Prisma Studio, poné tu usuario en `debeElegirContrasena: true`.
3. Volvé a la pestaña y apretá **Guardar cambios**.
4. Tiene que aparecer la pantalla de error con el texto *"Antes de seguir tenés que elegir
   una contraseña propia"*, y en la base **no** tiene que haber cambiado el estado.
5. Volvé a poner la marca en `false` para seguir trabajando.

Eso es lo que prueba que el guardia de las acciones no depende del de las pantallas.

- [ ] **Paso 4: commit**

```bash
git add src/app/admin/actions.ts src/app/periodos/actions.ts "src/app/periodos/[id]/actions.ts" src/app/planificar/actions.ts "src/app/asignaturas/[codigo]/actions.ts" src/app/produccion/actions.ts
git commit -m "feat: las server actions también exigen contraseña propia

Un formulario se puede disparar sin pasar por ninguna pantalla, así que el
guardia de las pantallas no alcanza. Las acciones lanzan en vez de redirigir,
que es el patrón de este proyecto: lo recoge src/app/error.tsx."
```

---

## Tarea 5: El perfil

**Archivos:**
- Crear: `src/app/perfil/page.tsx`, `src/app/perfil/FormPerfil.tsx`, `src/app/perfil/actions.ts`
- Modificar: `src/app/layout.tsx` (el bloque `.sesion`, líneas 49-58)

**Interfaces:**
- Consume: `exigirSesion()` de la tarea 1; `cambiarContrasenaPropia()` de la tarea 2;
  `Boton`, `CampoContrasena`, `IconoAlerta`.
- Produce: la ruta `/perfil`.

- [ ] **Paso 1: crear la acción**

Crear `src/app/perfil/actions.ts`:

```ts
'use server'

import { exigirSesionActiva } from '@/lib/sesion'
import { cambiarContrasenaPropia } from '@/lib/credenciales'

export type EstadoPerfil = { error: string | null; listo: boolean }

export async function cambiarMiContrasena(
  _prevState: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const s = await exigirSesionActiva()

  const actual = String(formData.get('actual') ?? '')
  const nueva = String(formData.get('contrasena') ?? '')
  const repetir = String(formData.get('repetir') ?? '')

  if (nueva !== repetir) return { error: 'Las dos contraseñas nuevas no coinciden', listo: false }

  const { error } = await cambiarContrasenaPropia(s.id, actual, nueva)
  if (error) return { error, listo: false }

  // Sin redirect: quedarse en la pantalla con el aviso de que salió bien es más
  // claro que aparecer en otro lugar sin saber si se guardó.
  return { error: null, listo: true }
}
```

- [ ] **Paso 2: crear el formulario**

Crear `src/app/perfil/FormPerfil.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { CampoContrasena } from '@/components/CampoContrasena'
import { IconoAlerta } from '@/components/iconos'
import { cambiarMiContrasena, type EstadoPerfil } from './actions'

const ESTADO_INICIAL: EstadoPerfil = { error: null, listo: false }

export function FormPerfil() {
  const [estado, accion] = useActionState(cambiarMiContrasena, ESTADO_INICIAL)

  return (
    <form action={accion} className="ficha">
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}
      {estado.listo && (
        <p className="mensaje-ok" role="status">
          Listo, tu contraseña nueva ya está activa.
        </p>
      )}
      <CampoContrasena
        id="actual"
        name="actual"
        label="Tu contraseña actual"
        autoComplete="current-password"
      />
      <CampoContrasena
        id="contrasena"
        name="contrasena"
        label="Contraseña nueva"
        autoComplete="new-password"
      />
      <CampoContrasena
        id="repetir"
        name="repetir"
        label="Repetila"
        autoComplete="new-password"
      />
      <Boton enCurso="Guardando">Cambiar mi contraseña</Boton>
    </form>
  )
}
```

- [ ] **Paso 3: crear la pantalla**

Crear `src/app/perfil/page.tsx`:

```tsx
import { exigirSesion } from '@/lib/sesion'
import { ROL_LABELS } from '@/lib/permisos'
import { FormPerfil } from './FormPerfil'

export const metadata = { title: 'Mi cuenta' }

export const dynamic = 'force-dynamic'

export default async function Perfil() {
  const s = await exigirSesion()

  return (
    <main>
      <div className="encabezado">
        <div>
          <h1>Mi cuenta</h1>
          <p className="sub">
            {s.nombre} · {s.email} · {ROL_LABELS[s.rol] ?? s.rol}
          </p>
        </div>
      </div>

      <h2>Cambiar mi contraseña</h2>
      <p className="ayuda">
        Nadie más que vos la va a saber. Si te la olvidás, se pide una nueva desde
        &ldquo;¿Olvidaste tu contraseña?&rdquo; en la pantalla de ingreso.
      </p>
      <FormPerfil />
    </main>
  )
}
```

El nombre, el correo y el rol se muestran pero no se editan: cambiarlos sigue siendo cosa
de administración, y está fuera del alcance de este trabajo.

- [ ] **Paso 4: enlazar desde la barra superior**

En `src/app/layout.tsx`, dentro del bloque `{s ? (...)}`, envolver el nombre en un enlace.
Reemplazar:

```tsx
              <span className="quien">
                <span className="inicial" aria-hidden>{s.nombre.trim().charAt(0).toUpperCase()}</span>
                <span className="nombre">{s.nombre}</span>
                <span className="rol">{ROL_LABELS[s.rol] ?? s.rol}</span>
              </span>
```

por:

```tsx
              <Link href="/perfil" className="quien" title="Mi cuenta">
                <span className="inicial" aria-hidden>{s.nombre.trim().charAt(0).toUpperCase()}</span>
                <span className="nombre">{s.nombre}</span>
                <span className="rol">{ROL_LABELS[s.rol] ?? s.rol}</span>
              </Link>
```

- [ ] **Paso 5: el estilo del enlace y del aviso de éxito**

Agregar al final de `src/app/globals.css`:

```css
/* El nombre de la barra ahora lleva al perfil: que se note que es clickeable. */
a.sesion .quien,
.sesion a.quien { border-radius: var(--radio-chico); padding: 2px var(--e1); }
.sesion a.quien:hover { background: rgba(255, 255, 255, .12); text-decoration: none; }

.mensaje-ok {
  background: var(--verde-fondo);
  border: 1px solid #bfe0d0;
  color: var(--verde);
  padding: var(--e3);
  border-radius: var(--radio-chico);
  font-size: 13px;
  margin: 0;
  font-weight: 600;
}
```

- [ ] **Paso 6: verificar**

```bash
npx tsc --noEmit && npm test
```

Esperado: `tsc` sin salida y toda la suite en verde. El test de guardias tiene que seguir
pasando: `/perfil` usa `exigirSesion()`.

- [ ] **Paso 7: probarlo en el navegador**

1. Hacé clic en tu nombre arriba a la derecha: tiene que abrir `/perfil`.
2. Poné mal la contraseña actual: tiene que decir que no coincide, y **no** cambiar nada.
3. Poné dos nuevas distintas: tiene que decir que no coinciden.
4. Hacelo bien: tiene que aparecer el aviso verde de que quedó activa.
5. Salí y entrá con la contraseña nueva.
6. En `/admin`, abajo, la bitácora tiene que tener la línea *"cambió su contraseña desde
   su perfil"*.

- [ ] **Paso 8: commit**

```bash
git add src/app/perfil src/app/layout.tsx src/app/globals.css
git commit -m "feat: pantalla de perfil para cambiar la contraseña propia

Hasta ahora nadie podía cambiar su propia contraseña: el único camino era
/admin, y sólo lo abre el rol admin. Pide la actual, que es lo que evita que
alguien que encuentre una sesión abierta se apropie de la cuenta."
```

---

## Tarea 6: El alta genera la provisoria

**Archivos:**
- Crear: `src/app/admin/FormAlta.tsx`
- Modificar: `src/app/admin/actions.ts` (`crearUsuario` líneas 21-43, `establecerContrasena` líneas 45-58)
- Modificar: `src/app/admin/page.tsx` (el formulario de alta, líneas 95-118)
- Modificar: `src/app/globals.css` (el cartel de la provisoria)

**Interfaces:**
- Consume: `generarProvisoria()` y `CONTRASENA_MINIMA` de la tarea 2.
- Produce: `crearUsuario` pasa a la firma `(prevState: EstadoAlta, formData: FormData) =>
  Promise<EstadoAlta>`, con `type EstadoAlta = { error: string | null; provisoria?: string;
  nombre?: string }`.

- [ ] **Paso 1: reescribir `crearUsuario`**

En `src/app/admin/actions.ts`, agregar `generarProvisoria` al import de
`@/lib/credenciales` y reemplazar la función entera por:

```ts
export type EstadoAlta = { error: string | null; provisoria?: string; nombre?: string }

/**
 * Devuelve la provisoria en lugar de lanzar, porque hay que mostrarla una sola
 * vez en pantalla. No puede viajar en la URL: quedaría en el historial del
 * navegador y en los logs del servidor.
 */
export async function crearUsuario(
  _prevState: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const admin = await exigirAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const rol = String(formData.get('rol') ?? '')

  if (!esCorreoInstitucional(email)) {
    return { error: 'El correo tiene que ser del dominio de la universidad (@ucc.edu.ar)' }
  }
  if (!nombre) return { error: 'Poné el nombre de la persona o del área' }
  if (!(ROLES as readonly string[]).includes(rol)) return { error: 'Rol inválido' }

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) return { error: `Ya existe un usuario con el correo ${email}` }

  const provisoria = generarProvisoria()
  await prisma.usuario.create({
    // debeElegirContrasena queda en true por el valor por defecto del modelo.
    data: { email, nombre, rol, passwordHash: hashContrasena(provisoria) },
  })
  await anotar(admin.id, `Alta de usuario: ${nombre} (${email}) como ${rol}`)
  revalidatePath('/admin')

  return { error: null, provisoria, nombre }
}
```

- [ ] **Paso 2: que el reinicio vuelva a marcar**

En la misma `src/app/admin/actions.ts`, dentro de `establecerContrasena`, cambiar el
`update` del usuario por:

```ts
  await prisma.usuario.update({
    where: { id: usuarioId },
    // Vuelve a marcar: esta contraseña la eligió administración, así que tiene
    // que dejar de servir en cuanto la persona entre.
    data: { passwordHash: hashContrasena(contrasena), debeElegirContrasena: true },
  })
```

- [ ] **Paso 3: crear el formulario de alta**

Crear `src/app/admin/FormAlta.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Boton } from '@/components/Boton'
import { IconoAlerta } from '@/components/iconos'
import { crearUsuario, type EstadoAlta } from './actions'

const ESTADO_INICIAL: EstadoAlta = { error: null }

export function FormAlta({ roles }: { roles: { valor: string; etiqueta: string }[] }) {
  const [estado, accion] = useActionState(crearUsuario, ESTADO_INICIAL)

  return (
    <>
      {estado.error && (
        <p className="mensaje-error" role="alert">
          <IconoAlerta />
          <span>{estado.error}</span>
        </p>
      )}

      {estado.provisoria && (
        <div className="provisoria" role="status">
          <p>
            <strong>{estado.nombre}</strong> ya está dada de alta. Pasale esta contraseña,
            que sirve una sola vez: al entrar va a tener que elegir la suya.
          </p>
          <code>{estado.provisoria}</code>
          <p className="nota">
            No queda guardada en ningún lado. Si cerrás esta pantalla sin copiarla, hay que
            generarle una nueva desde la columna Contraseña de la tabla de abajo.
          </p>
        </div>
      )}

      <form action={accion} className="ficha alta-usuario">
        <label htmlFor="nombre">
          Nombre
          <input id="nombre" name="nombre" required />
        </label>
        <label htmlFor="email">
          Correo institucional
          <input id="email" name="email" type="email" placeholder="alguien@ucc.edu.ar" required />
        </label>
        <label htmlFor="rol">
          Rol
          <select id="rol" name="rol" defaultValue="director">
            {roles.map((r) => (
              <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
            ))}
          </select>
        </label>
        <Boton enCurso="Dando de alta">Dar de alta</Boton>
      </form>
    </>
  )
}
```

Los roles llegan por prop y no se importan acá porque `ROL_LABELS` y `ROLES` viven en un
módulo de servidor; pasarlos ya armados evita arrastrarlo al bundle del cliente.

- [ ] **Paso 4: usarlo en la pantalla**

En `src/app/admin/page.tsx`, agregar el import:

```ts
import { FormAlta } from './FormAlta'
```

y reemplazar el `<form action={crearUsuario} className="ficha alta-usuario">` completo
—desde la etiqueta de apertura hasta su `</form>`, incluidos los cuatro `<label>` y el
`<Boton>`— por:

```tsx
      <FormAlta roles={ROLES.map((r) => ({ valor: r, etiqueta: ROL_LABELS[r] }))} />
```

Y sacar `crearUsuario` del import de `./actions`, que ya no se usa en este archivo.

- [ ] **Paso 5: el estilo del cartel**

Agregar al final de `src/app/globals.css`:

```css
/* La provisoria se muestra una sola vez y hay que poder leerla y dictarla sin
   equivocarse: monoespaciada, grande y separada del resto. */
.provisoria {
  background: var(--verde-fondo);
  border: 1px solid #bfe0d0;
  border-radius: var(--radio);
  padding: var(--e4);
  margin: 0 0 var(--e4);
  max-width: 560px;
}
.provisoria p { margin: 0 0 var(--e3); font-size: 13.5px; color: var(--verde); }
.provisoria code {
  display: block;
  background: #fff;
  border: 1px solid #bfe0d0;
  color: var(--texto);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: .04em;
  padding: var(--e3);
  border-radius: var(--radio-chico);
  user-select: all;
}
.provisoria .nota { margin: var(--e3) 0 0; font-size: 12px; color: var(--texto-suave); }
```

- [ ] **Paso 6: verificar**

```bash
npx tsc --noEmit && npm test
```

Esperado: `tsc` sin salida y toda la suite en verde.

- [ ] **Paso 7: probar el circuito completo en el navegador**

1. En `/admin`, dá de alta a alguien con un correo `@ucc.edu.ar` que no exista. Tiene que
   aparecer el cartel verde con la provisoria en grande.
2. Probá dar de alta el mismo correo otra vez: tiene que decir que ya existe **dentro del
   formulario**, sin sacarte de la pantalla ni perder lo escrito.
3. Probá con un correo que no sea `@ucc.edu.ar`: mismo comportamiento.
4. Salí, entrá con ese correo y la provisoria: tiene que llevarte a `/elegir-contrasena`.
5. Elegí una propia y entrá.
6. Volvé a entrar como administración y, en la tabla de usuarios, fijale una contraseña
   nueva a ese usuario. Después entrá con ella: **tiene que volver a pedirte elegir una**.
   Eso es lo que prueba que el reinicio vuelve a marcar.

- [ ] **Paso 8: verificar que compila para producción**

Parar el dev server antes, porque el build corre `prisma generate`:

```bash
npm run build
```

Esperado: `✓ Compiled successfully` y en la lista de rutas tienen que aparecer
`/elegir-contrasena` y `/perfil`.

- [ ] **Paso 9: commit**

```bash
git add src/app/admin src/app/globals.css
git commit -m "feat(admin): el alta genera la provisoria y el reinicio vuelve a marcar

Administración deja de inventar contraseñas: el sistema genera una de un solo
uso y la muestra una vez para copiarla y dictarla. Las validaciones del alta
pasan a mostrarse dentro del formulario en vez de sacar a la persona de la
pantalla y hacerle perder lo escrito.

Y fijarle una contraseña a alguien vuelve a marcar su cuenta, así el circuito
cierra: cada vez que alguien que no es el dueño la toca, el dueño la reemplaza
al entrar."
```

---

## Después del plan

Antes de desplegar hay que **avisarles a las 16 personas** que ya usan el sistema: la
próxima vez que entren se van a encontrar con la pantalla de elegir contraseña. No es un
error y no pierden nada, pero conviene que no las tome por sorpresa.

La migración se aplica sola en el deploy: el `buildCommand` de `vercel.json` ya corre
`prisma migrate deploy`.

Queda anotado como agujero aparte, fuera de este trabajo: **el ingreso no tiene límite de
intentos**. Cualquiera puede probar contraseñas sin freno, y eso vale más ahora que cada
persona elige la suya.
