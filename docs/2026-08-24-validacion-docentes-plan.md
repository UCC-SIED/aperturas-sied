# Validación de docentes por Unidad Académica — plan de implementación

> **Para quien lo ejecute:** usar `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ir tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** que Unidad Académica (y, como excepción, Administración) pueda marcar como
validado el grupo de docente(s) tutor(es) de una apertura y el grupo de contenidista(s)
de una asignatura, con la validación apagándose sola si esa lista cambia.

**Arquitectura:** dos campos booleanos nuevos (`Apertura.docenteTutorValidado`,
`Asignatura.contenidistasValidados`), un permiso nuevo (`puedeValidarDocentes`) exclusivo
de los roles `unidad` y `admin`, y una comparación de conjuntos (`mismoGrupoDeDocentes`)
que decide si un cambio de docentes debe apagar la validación. La lógica pura vive en
`src/lib/` y se prueba con Vitest; las server actions quedan como envoltorios finos,
verificados a mano en el navegador — es el mismo patrón que ya usa el resto de
`actions.ts` en este proyecto (ninguno se prueba de forma automatizada hoy).

**Stack:** Next 16 (App Router, server actions), Prisma 6, PostgreSQL en producción y
SQLite en desarrollo y tests, Vitest.

Diseño aprobado: [docs/2026-08-24-validacion-docentes-design.md](2026-08-24-validacion-docentes-design.md)

## Restricciones globales

- **Todo en castellano rioplatense**: nombres de funciones, variables, comentarios, textos
  de pantalla y mensajes de commit. Es la convención del repo entero, sin excepciones.
- **Los comentarios explican por qué, no qué.** Mirá los que ya hay en `src/lib/` como
  referencia de tono y de largo.
- **Errores esperados como valor de retorno, nunca `throw` suelto**: toda acción de
  formulario en este proyecto envuelve su cuerpo en `comoResultado(async () => {...})`
  (de `src/lib/accion.ts`), que atrapa cualquier `throw new Error(...)` interno y lo
  convierte en `{ error: mensaje }`. Sólo hay que `throw`, `comoResultado` hace el resto —
  ver `src/app/periodos/actions.ts` como referencia de un archivo que ya sigue este patrón
  al pie de la letra.
- **`prisma generate` falla en Windows si el servidor de desarrollo está corriendo**
  (`EPERM ... query_engine-windows.dll.node`). Parar el dev server (o el preview de
  Claude Code) antes de cualquier paso que regenere el cliente.
- **El `provider` de `prisma/schema.prisma` se reescribe según a dónde apunte la base.**
  Para trabajar en local tiene que decir `sqlite`: correr `npm run db:local` si aparece un
  error `the URL must start with the protocol postgresql://`. No commitear el schema
  apuntando a `postgresql`.
- **Las migraciones versionadas se escriben para PostgreSQL** (`migration_lock.toml` dice
  `postgresql`). En local el esquema se aplica con `prisma db push`, nunca con
  `migrate dev`. En producción corre sola con `prisma migrate deploy`, que ya está en el
  `buildCommand` de `vercel.json`.
- **Sólo `unidad` y `admin` validan.** No reutilizar `esEquipo` (que junta `sied` +
  `admin`) para esto: acá `sied` queda afuera a propósito, es la única acción de todo el
  sistema con esa restricción.
- **La comparación de grupos de docentes ignora el orden.** `['Ana', 'Juan']` y
  `['Juan', 'Ana']` son el mismo grupo.
- **No se prueban las `actions.ts` de forma automatizada — a propósito, no por
  descuido.** Llaman `revalidatePath` y, a través de `exigirSesionActiva`, `cookies()`:
  las dos dependen del contexto de una request real de Next.js (`work-async-storage`),
  que no existe corriendo Vitest suelto. Por eso ningún archivo `actions.ts` de este
  proyecto se importa hoy desde `tests/` (confirmado antes de escribir este plan). La
  lógica que sí se puede aislar —`mismoGrupoDeDocentes`— se prueba en la Tarea 2; el
  resto (que esa comparación se use bien dentro de cada acción) se verifica a mano en el
  navegador, en la Tarea 10.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `prisma/schema.prisma` | Los dos campos nuevos, en `Apertura` y `Asignatura` | 1 |
| `prisma/migrations/20260825010000_validacion_docentes/migration.sql` | Alta de las dos columnas en PostgreSQL | 1 |
| `src/lib/docentes.ts` | Se agrega `mismoGrupoDeDocentes` | 2 |
| `tests/docentes.test.ts` | Pruebas de `mismoGrupoDeDocentes` | 2 |
| `src/lib/permisos.ts` | Se agrega `puedeValidarDocentes` | 3 |
| `tests/permisos.test.ts` | Pruebas de `puedeValidarDocentes` | 3 |
| `src/app/planificar/actions.ts` | `editarDocentesTutorApertura` apaga la validación si cambia el grupo; se agrega `alternarValidacionDocenteTutor` | 4 |
| `src/app/periodos/[id]/actions.ts` | `editarDocentesApertura` apaga la validación si cambia el grupo | 5 |
| `src/app/asignaturas/[codigo]/actions.ts` | `actualizarAsignatura` apaga la validación si cambia el grupo; se agrega `alternarValidacionContenidistas` | 6 |
| `src/components/MarcaValidado.tsx` | **Nuevo.** Sello de sólo lectura ("✓ Validado") reutilizado en las tres pantallas | 7 |
| `src/app/planificar/page.tsx` | Interruptor (Unidad/Admin) o sello (resto) junto al docente tutor de cada celda | 7 |
| `src/app/periodos/[id]/page.tsx` | Sello de sólo lectura junto al docente tutor de cada apertura | 8 |
| `src/app/asignaturas/[codigo]/page.tsx` | Interruptor (Unidad/Admin) o sello (resto) junto al campo Docente | 9 |
| `src/app/globals.css` | Estilos de `.marca-validado` y del botón de alternar | 7 |

---

## Tarea 1: Modelo de datos y migración

**Archivos:**
- Modificar: `prisma/schema.prisma` (modelo `Apertura`, modelo `Asignatura`)
- Crear: `prisma/migrations/20260825010000_validacion_docentes/migration.sql`

**Interfaces:**
- Consume: nada.
- Produce: `Apertura.docenteTutorValidado: boolean` y
  `Asignatura.contenidistasValidados: boolean`, los dos con default `false`, disponibles
  en el cliente de Prisma regenerado.

- [ ] **Paso 1: asegurarse de que el esquema apunte a SQLite**

Correr:
```bash
npm run db:local
```
Esperado: `schema.prisma: postgresql -> sqlite` o ningún cambio si ya estaba en sqlite.

- [ ] **Paso 2: agregar los campos al esquema**

En `prisma/schema.prisma`, dentro de `model Apertura { ... }`, agregar al final del
bloque (antes del `}` de cierre):

```prisma
  /// Unidad Académica (o Administración) confirmó que el o los docentes tutores
  /// son correctos para esta apertura puntual. Se apaga solo si esa lista cambia
  /// (se agrega, saca o renombra a alguien).
  docenteTutorValidado Boolean @default(false)
```

Dentro de `model Asignatura { ... }`, agregar al final del bloque (antes del `}` de
cierre, después de `aperturas Apertura[]`):

```prisma
  /// Unidad Académica (o Administración) confirmó el grupo de contenidistas de
  /// esta asignatura, sean uno o varios. Se apaga solo si esa lista cambia.
  contenidistasValidados Boolean @default(false)
```

- [ ] **Paso 3: aplicar el cambio en local**

Correr (con el dev server parado):
```bash
npx prisma db push
```
Esperado: `Your database is now in sync with your Prisma schema` y luego
`✔ Generated Prisma Client`.

- [ ] **Paso 4: escribir la migración para producción**

Crear `prisma/migrations/20260825010000_validacion_docentes/migration.sql`:

```sql
-- AlterTable
-- Unidad Académica (o Administración) deja constancia de que revisó el docente
-- tutor de una apertura y el grupo de contenidistas de una asignatura.
ALTER TABLE "Apertura" ADD COLUMN "docenteTutorValidado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Asignatura" ADD COLUMN "contenidistasValidados" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Paso 5: verificar que el cliente generado tenga los campos**

Correr:
```bash
npx tsc --noEmit
```
Esperado: sin errores (todavía no se usan los campos en ningún lado, pero el tipo
`Apertura` y `Asignatura` del cliente Prisma ya los tienen que traer).

- [ ] **Paso 6: commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260825010000_validacion_docentes
git commit -m "feat(db): agregar docenteTutorValidado y contenidistasValidados"
```

---

## Tarea 2: `mismoGrupoDeDocentes`

**Archivos:**
- Modificar: `src/lib/docentes.ts`
- Test: `tests/docentes.test.ts`

**Interfaces:**
- Consume: nada (función pura, sin dependencias).
- Produce: `mismoGrupoDeDocentes(a: string[], b: string[]): boolean`, usada por las
  Tareas 4, 5 y 6 para decidir si hay que apagar una validación.

- [ ] **Paso 1: escribir el test que falla**

Agregar al final de `tests/docentes.test.ts`:

```ts
describe('mismoGrupoDeDocentes', () => {
  it('el mismo grupo en el mismo orden es igual', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Ana Paz', 'Juan Ruiz'])).toBe(true)
  })

  it('el mismo grupo en otro orden también es igual', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Juan Ruiz', 'Ana Paz'])).toBe(true)
  })

  it('agregar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz'], ['Ana Paz', 'Juan Ruiz'])).toBe(false)
  })

  it('sacar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz', 'Juan Ruiz'], ['Ana Paz'])).toBe(false)
  })

  it('renombrar a alguien es un grupo distinto', () => {
    expect(mismoGrupoDeDocentes(['Ana Paz'], ['Ana Paza'])).toBe(false)
  })

  it('dos listas vacías son el mismo grupo (nadie)', () => {
    expect(mismoGrupoDeDocentes([], [])).toBe(true)
  })
})
```

Y agregar `mismoGrupoDeDocentes` al import existente en la primera línea del archivo:
```ts
import { parseDocentes, joinDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'
```

- [ ] **Paso 2: correr el test y confirmar que falla**

```bash
npx vitest run tests/docentes.test.ts
```
Esperado: `FAIL` — `mismoGrupoDeDocentes is not a function` o similar, porque todavía no
existe.

- [ ] **Paso 3: implementar**

Agregar al final de `src/lib/docentes.ts`:

```ts
/**
 * Si dos listas de docentes son el mismo grupo de personas, sin importar el
 * orden. La usan las validaciones de Unidad Académica para saber si hay que
 * apagarlas: lo que se había aprobado era ese grupo puntual.
 */
export function mismoGrupoDeDocentes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const ordenadosA = [...a].sort()
  const ordenadosB = [...b].sort()
  return ordenadosA.every((nombre, i) => nombre === ordenadosB[i])
}
```

- [ ] **Paso 4: correr el test y confirmar que pasa**

```bash
npx vitest run tests/docentes.test.ts
```
Esperado: `PASS`, todos los tests del archivo en verde.

- [ ] **Paso 5: commit**

```bash
git add src/lib/docentes.ts tests/docentes.test.ts
git commit -m "feat: agregar mismoGrupoDeDocentes para detectar cambios de grupo"
```

---

## Tarea 3: `puedeValidarDocentes`

**Archivos:**
- Modificar: `src/lib/permisos.ts`
- Test: `tests/permisos.test.ts`

**Interfaces:**
- Consume: el tipo `Sesion` ya definido en `src/lib/permisos.ts`.
- Produce: `puedeValidarDocentes(s: Sesion | null): boolean`, usada por las Tareas 4 y 6
  dentro de las nuevas acciones de validar, y por las Tareas 7 y 9 para decidir si una
  pantalla muestra el interruptor o el sello de sólo lectura.

- [ ] **Paso 1: escribir el test que falla**

Agregar al final de `tests/permisos.test.ts` (después del `describe('esCorreoInstitucional', ...)`):

```ts
describe('puedeValidarDocentes', () => {
  it('unidad académica y administración pueden validar', () => {
    expect(puedeValidarDocentes(unidad)).toBe(true)
    expect(puedeValidarDocentes(admin)).toBe(true)
  })

  it('ni siquiera el equipo SIED puede validar', () => {
    expect(puedeValidarDocentes(sied)).toBe(false)
  })

  it('dirección de carrera y consulta tampoco pueden', () => {
    expect(puedeValidarDocentes(dir)).toBe(false)
    expect(puedeValidarDocentes(consulta)).toBe(false)
  })

  it('sin sesión no se puede', () => {
    expect(puedeValidarDocentes(null)).toBe(false)
  })
})
```

Y agregar `puedeValidarDocentes` al import existente en la primera línea del archivo:
```ts
import {
  puedeEditarCarrera, puedeEditarProduccion, esSoloLectura, carrerasVisibles,
  puedeAdministrar, esCorreoInstitucional, puedeValidarDocentes,
} from '@/lib/permisos'
```

- [ ] **Paso 2: correr el test y confirmar que falla**

```bash
npx vitest run tests/permisos.test.ts
```
Esperado: `FAIL` — `puedeValidarDocentes is not a function`.

- [ ] **Paso 3: implementar**

Agregar en `src/lib/permisos.ts`, justo después de la función `puedeAdministrar`:

```ts
/**
 * Deja constancia de que se revisó un docente tutor o un grupo de
 * contenidistas y son correctos. Exclusivo de estos dos roles — ni siquiera
 * el equipo SIED, que carga la mayoría de estos datos, puede validarlos.
 */
export function puedeValidarDocentes(s: Sesion | null): boolean {
  return s?.rol === 'unidad' || s?.rol === 'admin'
}
```

- [ ] **Paso 4: correr el test y confirmar que pasa**

```bash
npx vitest run tests/permisos.test.ts
```
Esperado: `PASS`, todos los tests del archivo en verde.

- [ ] **Paso 5: commit**

```bash
git add src/lib/permisos.ts tests/permisos.test.ts
git commit -m "feat: agregar puedeValidarDocentes (unidad y admin, exclusivo)"
```

---

## Tarea 4: Validar el docente tutor de una apertura

**Archivos:**
- Modificar: `src/app/planificar/actions.ts`

**Interfaces:**
- Consume: `mismoGrupoDeDocentes` (Tarea 2), `puedeValidarDocentes` (Tarea 3),
  `comoResultado` (ya existente en `src/lib/accion.ts`), `type EstadoAccion` (ya existente
  en `src/lib/estado-accion.ts`).
- Produce: `alternarValidacionDocenteTutor(aperturaId: number, _prevState: EstadoAccion,
  _formData: FormData): Promise<EstadoAccion>`, usada por la Tarea 7 en
  `src/app/planificar/page.tsx`.

Este archivo ya tiene `editarDocentesTutorApertura`, que hoy no lee el grupo de docentes
anterior antes de reemplazarlo. Hay que leerlo primero para poder comparar.

- [ ] **Paso 1: agregar el import de `mismoGrupoDeDocentes`**

En `src/app/planificar/actions.ts`, la línea:
```ts
import { parseDocentes } from '@/lib/docentes'
```
pasa a:
```ts
import { parseDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'
```

- [ ] **Paso 2: leer el grupo anterior y apagar la validación si cambió**

Dentro de `editarDocentesTutorApertura`, reemplazar este bloque:

```ts
    const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

    await prisma.aperturaDocente.deleteMany({ where: { aperturaId } })
    if (docentes.length) {
      await prisma.aperturaDocente.createMany({
        data: docentes.map((nombre, orden) => ({ aperturaId, nombre, orden })),
      })
    }
```

por:

```ts
    const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

    // Si el grupo cambió, lo que se había validado ya no aplica: era sobre
    // esas personas puntuales.
    const anteriores = apertura.docentesTutor.map((d) => d.nombre)
    if (!mismoGrupoDeDocentes(anteriores, docentes)) {
      await prisma.apertura.update({ where: { id: aperturaId }, data: { docenteTutorValidado: false } })
    }

    await prisma.aperturaDocente.deleteMany({ where: { aperturaId } })
    if (docentes.length) {
      await prisma.aperturaDocente.createMany({
        data: docentes.map((nombre, orden) => ({ aperturaId, nombre, orden })),
      })
    }
```

Esto necesita que la consulta de `apertura` ya traiga `docentesTutor`. Buscar, un poco
más arriba en la misma función, este bloque:

```ts
    const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: {
        asignatura: { include: { planItems: true } },
        cohortes: { include: { cohorte: true } },
      },
    })
```

y agregarle `docentesTutor: true`:

```ts
    const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: {
        asignatura: { include: { planItems: true } },
        cohortes: { include: { cohorte: true } },
        docentesTutor: true,
      },
    })
```

- [ ] **Paso 3: agregar la acción de alternar**

Al final de `src/app/planificar/actions.ts`, agregar:

```ts
/**
 * Prende o apaga la validación del grupo de docentes tutores de esta
 * apertura. Exclusivo de Unidad Académica y Administración: ni siquiera el
 * equipo SIED, que suele cargar estos mismos datos, puede tocarla.
 */
export async function alternarValidacionDocenteTutor(
  aperturaId: number,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeValidarDocentes(s)) {
      throw new Error('Sólo Unidad Académica o Administración pueden validar')
    }

    const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: { asignatura: true },
    })
    if (!apertura) throw new Error('Apertura inexistente')

    const nuevoValor = !apertura.docenteTutorValidado
    await prisma.apertura.update({ where: { id: aperturaId }, data: { docenteTutorValidado: nuevoValor } })
    await prisma.cambio.create({
      data: {
        usuarioId: s.id,
        accion: 'valido_docente_tutor',
        detalle: `${apertura.asignatura.nombre}: docente tutor ${nuevoValor ? 'validado' : 'desvalidado'}`,
        asignaturaCodigo: apertura.asignaturaCodigo,
      },
    })
    revalidatePath('/', 'layout')
  })
}
```

Este archivo ya importa `puedeEditarCarrera` desde `@/lib/permisos` — agregarle
`puedeValidarDocentes` al mismo import:
```ts
import { puedeEditarCarrera, puedeValidarDocentes } from '@/lib/permisos'
```

- [ ] **Paso 4: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 5: commit**

```bash
git add src/app/planificar/actions.ts
git commit -m "feat: apagar y alternar la validación del docente tutor en planificar"
```

---

## Tarea 5: Lo mismo en la pantalla de un período

**Archivos:**
- Modificar: `src/app/periodos/[id]/actions.ts`

**Interfaces:**
- Consume: `mismoGrupoDeDocentes` (Tarea 2).
- Produce: nada nuevo — sólo hace que `editarDocentesApertura` apague la validación
  cuando corresponda. Ésta es la otra acción (además de la de la Tarea 4) que puede
  cambiar el grupo de docentes tutores.

- [ ] **Paso 1: agregar el import**

En `src/app/periodos/[id]/actions.ts`:
```ts
import { parseDocentes } from '@/lib/docentes'
```
pasa a:
```ts
import { parseDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'
```

- [ ] **Paso 2: incluir el grupo anterior en la consulta**

Dentro de `editarDocentesApertura`, este bloque:

```ts
  const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: { asignatura: true },
    })
    if (!apertura) throw new Error('Apertura inexistente')
```

pasa a:

```ts
  const apertura = await prisma.apertura.findUnique({
      where: { id: aperturaId },
      include: { asignatura: true, docentesTutor: true },
    })
    if (!apertura) throw new Error('Apertura inexistente')
```

- [ ] **Paso 3: apagar la validación si el grupo cambió**

Este bloque:

```ts
    const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

    await prisma.aperturaDocente.deleteMany({ where: { aperturaId } })
    if (docentes.length) {
      await prisma.aperturaDocente.createMany({
        data: docentes.map((nombre, orden) => ({ aperturaId, nombre, orden })),
      })
    }
```

pasa a:

```ts
    const docentes = parseDocentes(String(formData.get('docentesTutor') ?? ''))

    const anteriores = apertura.docentesTutor.map((d) => d.nombre)
    if (!mismoGrupoDeDocentes(anteriores, docentes)) {
      await prisma.apertura.update({ where: { id: aperturaId }, data: { docenteTutorValidado: false } })
    }

    await prisma.aperturaDocente.deleteMany({ where: { aperturaId } })
    if (docentes.length) {
      await prisma.aperturaDocente.createMany({
        data: docentes.map((nombre, orden) => ({ aperturaId, nombre, orden })),
      })
    }
```

- [ ] **Paso 4: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 5: commit**

```bash
git add src/app/periodos/[id]/actions.ts
git commit -m "feat: apagar la validación del docente tutor también desde /periodos"
```

---

## Tarea 6: Validar los contenidistas de una asignatura

**Archivos:**
- Modificar: `src/app/asignaturas/[codigo]/actions.ts`

**Interfaces:**
- Consume: `mismoGrupoDeDocentes` (Tarea 2), `puedeValidarDocentes` (Tarea 3).
- Produce: `alternarValidacionContenidistas(codigo: string, _prevState: EstadoAccion,
  _formData: FormData): Promise<EstadoAccion>`, usada por la Tarea 9 en
  `src/app/asignaturas/[codigo]/page.tsx`.

- [ ] **Paso 1: agregar los imports**

En `src/app/asignaturas/[codigo]/actions.ts`:
```ts
import { parseDocentes } from '@/lib/docentes'
import { puedeEditarProduccion } from '@/lib/permisos'
```
pasa a:
```ts
import { parseDocentes, mismoGrupoDeDocentes } from '@/lib/docentes'
import { puedeEditarProduccion, puedeValidarDocentes } from '@/lib/permisos'
```

- [ ] **Paso 2: incluir el grupo anterior en la consulta de `actualizarAsignatura`**

Este bloque, dentro de `actualizarAsignatura`:

```ts
    const previa = await prisma.asignatura.findUnique({ where: { codigo } })
    if (!previa) throw new Error('Asignatura inexistente')
```

pasa a:

```ts
    const previa = await prisma.asignatura.findUnique({
      where: { codigo },
      include: { docentes: true },
    })
    if (!previa) throw new Error('Asignatura inexistente')
```

- [ ] **Paso 3: apagar la validación si el grupo cambió**

Este bloque:

```ts
    await prisma.asignatura.update({
      where: { codigo },
      data: { estado, asesor },
    })
```

pasa a:

```ts
    const anteriores = previa.docentes.map((d) => d.nombre)
    await prisma.asignatura.update({
      where: { codigo },
      data: {
        estado,
        asesor,
        ...(mismoGrupoDeDocentes(anteriores, docentes) ? {} : { contenidistasValidados: false }),
      },
    })
```

(La variable `docentes` ya existe un poco más arriba en la misma función, calculada con
`parseDocentes(String(formData.get('docente') ?? ''))` — no hace falta tocarla.)

- [ ] **Paso 4: agregar la acción de alternar**

Al final de `src/app/asignaturas/[codigo]/actions.ts`, agregar:

```ts
/**
 * Prende o apaga la validación del grupo de contenidistas de esta
 * asignatura. Exclusivo de Unidad Académica y Administración.
 */
export async function alternarValidacionContenidistas(
  codigo: string,
  _prevState: EstadoAccion,
  _formData: FormData,
): Promise<EstadoAccion> {
  return comoResultado(async () => {
    const s = await exigirSesionActiva()
    if (!puedeValidarDocentes(s)) {
      throw new Error('Sólo Unidad Académica o Administración pueden validar')
    }

    const a = await prisma.asignatura.findUnique({ where: { codigo } })
    if (!a) throw new Error('Asignatura inexistente')

    const nuevoValor = !a.contenidistasValidados
    await prisma.asignatura.update({ where: { codigo }, data: { contenidistasValidados: nuevoValor } })
    await prisma.cambio.create({
      data: {
        usuarioId: s.id,
        accion: 'valido_contenidistas',
        detalle: `${a.nombre}: contenidistas ${nuevoValor ? 'validados' : 'desvalidados'}`,
        asignaturaCodigo: codigo,
      },
    })
    revalidatePath('/', 'layout')
  })
}
```

- [ ] **Paso 5: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 6: commit**

```bash
git add src/app/asignaturas/[codigo]/actions.ts
git commit -m "feat: apagar y alternar la validación de contenidistas"
```

---

## Tarea 7: Interfaz en Planificar

**Archivos:**
- Crear: `src/components/MarcaValidado.tsx`
- Modificar: `src/app/planificar/page.tsx`
- Modificar: `src/app/globals.css`

**Interfaces:**
- Consume: `alternarValidacionDocenteTutor` (Tarea 4), `puedeValidarDocentes` (Tarea 3),
  `FormConError` (ya existente en `src/components/FormConError.tsx`), `Boton` (ya
  existente en `src/components/Boton.tsx`).
- Produce: el componente `MarcaValidado`, reutilizado también por las Tareas 8 y 9.

- [ ] **Paso 1: crear el componente de sello**

Crear `src/components/MarcaValidado.tsx`:

```tsx
/**
 * El sello de sólo lectura que ve cualquiera que no sea Unidad Académica o
 * Administración. No es un botón: quien no puede validar no tiene con qué
 * tocarlo.
 */
export function MarcaValidado() {
  return <span className="marca-validado">✓ Validado</span>
}
```

- [ ] **Paso 2: agregar el estilo**

En `src/app/globals.css`, agregar (cerca de `.estado-badge`, para mantener juntos los
sellos de estado):

```css
.marca-validado {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--verde);
  background: var(--verde-fondo);
  border-radius: 4px;
  padding: 2px 7px;
}
```

- [ ] **Paso 3: importar lo necesario en `planificar/page.tsx`**

Agregar a los imports existentes de `src/app/planificar/page.tsx`:

```ts
import { MarcaValidado } from '@/components/MarcaValidado'
import { puedeValidarDocentes } from '@/lib/permisos'
import { alternarValidacionDocenteTutor } from './actions'
```

(El import de `agregarApertura, quitarApertura, moverApertura, crearCohorte,
descartarAviso, editarDocentesTutorApertura` que ya existe desde `./actions` se extiende
con `alternarValidacionDocenteTutor` en la misma línea.)

- [ ] **Paso 4: calcular el permiso una sola vez**

En la función `Planificar`, justo después de la línea:
```ts
  const puedeVerMovimientos = puedeEditarProduccion(s)
```
agregar:
```ts
  const puedeValidar = puedeValidarDocentes(s)
```

- [ ] **Paso 5: mostrar el interruptor o el sello junto al docente tutor**

En el bloque que hoy muestra el docente tutor de cada celda (dentro del `.map` de
`enCelda`), buscar:

```tsx
                              {editable ? (
                                <details className="editar-docente-tutor">
                                  <summary>
                                    {ap.docentesTutor.length
                                      ? `Docente tutor: ${ap.docentesTutor.join(' / ')}`
                                      : 'Asignar docente tutor'}
                                  </summary>
                                  <FormConError action={editarDocentesTutorApertura.bind(null, carrera.id)} className="fila-campos">
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <EditorDocentes
                                      name="docentesTutor"
                                      iniciales={ap.docentesTutor}
                                      etiqueta={`docente tutor de ${ap.asignatura.nombre}`}
                                    />
                                    <Boton enCurso="Guardando">Guardar</Boton>
                                  </FormConError>
                                </details>
                              ) : (
                                ap.docentesTutor.length > 0 && (
                                  <p className="compartida">Docente tutor: {ap.docentesTutor.join(' / ')}</p>
                                )
                              )}
```

y reemplazarlo por:

```tsx
                              {editable ? (
                                <details className="editar-docente-tutor">
                                  <summary>
                                    {ap.docentesTutor.length
                                      ? `Docente tutor: ${ap.docentesTutor.join(' / ')}`
                                      : 'Asignar docente tutor'}
                                    {ap.docenteTutorValidado && ' ✓'}
                                  </summary>
                                  <FormConError action={editarDocentesTutorApertura.bind(null, carrera.id)} className="fila-campos">
                                    <input type="hidden" name="aperturaId" value={ap.id} />
                                    <EditorDocentes
                                      name="docentesTutor"
                                      iniciales={ap.docentesTutor}
                                      etiqueta={`docente tutor de ${ap.asignatura.nombre}`}
                                    />
                                    <Boton enCurso="Guardando">Guardar</Boton>
                                  </FormConError>
                                  {puedeValidar && (
                                    <FormConError action={alternarValidacionDocenteTutor.bind(null, ap.id)}>
                                      <Boton className={ap.docenteTutorValidado ? 'quitar' : undefined} enCurso="…">
                                        {ap.docenteTutorValidado ? 'Quitar validación' : 'Validar docente tutor'}
                                      </Boton>
                                    </FormConError>
                                  )}
                                </details>
                              ) : (
                                ap.docentesTutor.length > 0 && (
                                  <p className="compartida">
                                    Docente tutor: {ap.docentesTutor.join(' / ')}
                                    {ap.docenteTutorValidado && <MarcaValidado />}
                                  </p>
                                )
                              )}
```

- [ ] **Paso 6: traer `docenteTutorValidado` en la consulta de aperturas**

`AperturaGrilla` (en `src/lib/grilla.ts`) no incluye hoy `docenteTutorValidado`. Agregar el
campo al tipo, en `src/lib/grilla.ts`:

```ts
export type AperturaGrilla = {
  id: number
  asignaturaCodigo: string
  periodoId: number
  cohorteIds: number[]
  /** Nombres de otras carreras que también la abrieron (transversal), sin la propia. */
  carrerasCompartidas: string[]
  /** Docente tutor de esta apertura puntual, no el de producción de la asignatura. */
  docentesTutor: string[]
  /** Si Unidad Académica (o Administración) ya confirmó ese grupo de docentes. */
  docenteTutorValidado: boolean
  asignatura: { codigo: string; nombre: string; estado: string }
  aperturaInscripcion: Date | null
}
```

Y en `src/app/planificar/page.tsx`, donde se arma `aperturas: AperturaGrilla[]` a partir
de `aperturasBase`, agregar el campo al objeto mapeado:

```ts
  const aperturas: AperturaGrilla[] = aperturasBase.map((a) => ({
    id: a.id,
    asignaturaCodigo: a.asignaturaCodigo,
    periodoId: a.periodoId,
    cohorteIds: a.cohortes.map((c) => c.cohorteId),
    carrerasCompartidas: [...new Set(
      a.cohortes.filter((c) => c.cohorte.carreraId !== carrera.id).map((c) => c.cohorte.carrera.nombre),
    )],
    docentesTutor: a.docentesTutor.map((d) => d.nombre),
    docenteTutorValidado: a.docenteTutorValidado,
    asignatura: { codigo: a.asignatura.codigo, nombre: a.asignatura.nombre, estado: a.asignatura.estado },
    aperturaInscripcion: a.aperturaInscripcion,
  }))
```

(La consulta `prisma.apertura.findMany` que llena `aperturasBase`, un poco más arriba en
el mismo archivo, ya trae la fila completa de `Apertura` — no hace falta agregarle nada,
`docenteTutorValidado` viene incluido solo.)

- [ ] **Paso 7: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 8: commit**

```bash
git add src/components/MarcaValidado.tsx src/app/globals.css src/app/planificar/page.tsx src/lib/grilla.ts
git commit -m "feat: interruptor de validación del docente tutor en /planificar"
```

---

## Tarea 8: Sello de sólo lectura en la pantalla de un período

**Archivos:**
- Modificar: `src/app/periodos/[id]/page.tsx`

**Interfaces:**
- Consume: `MarcaValidado` (Tarea 7).
- Produce: nada nuevo — sólo muestra lo que ya existe.

Esta pantalla no la usan ni Unidad ni Dirección para cargar el tutor (el control de ahí
está detrás de `puedeEditarProduccion`, que sólo tienen SIED y Administración), así que
acá la marca es siempre de sólo lectura, sin interruptor.

- [ ] **Paso 1: importar `MarcaValidado`**

Agregar a los imports de `src/app/periodos/[id]/page.tsx`:
```ts
import { MarcaValidado } from '@/components/MarcaValidado'
```

- [ ] **Paso 2: mostrar la marca junto al docente tutor**

Buscar, dentro de la celda que muestra el docente tutor de cada apertura:

```tsx
                    <td>
                      {editable ? (
                        <details className="editar-docente-tutor">
                          <summary>{joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || 'Asignar'}</summary>
```

y cambiar la línea del `<summary>` para incluir la marca:

```tsx
                    <td>
                      {editable ? (
                        <details className="editar-docente-tutor">
                          <summary>
                            {joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || 'Asignar'}
                            {ap.docenteTutorValidado && ' ✓'}
                          </summary>
```

Un poco más abajo, en la rama de sólo lectura (cuando `!editable`):

```tsx
                      ) : (
                        joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || '—'
                      )}
```

pasa a:

```tsx
                      ) : (
                        <>
                          {joinDocentes(ap.docentesTutor.map((d) => d.nombre)) || '—'}
                          {ap.docenteTutorValidado && <MarcaValidado />}
                        </>
                      )}
```

- [ ] **Paso 3: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores (el tipo de `periodo.aperturas` sale de la consulta de Prisma en
esta misma página, que ya trae la fila completa de `Apertura`; `docenteTutorValidado`
llega solo).

- [ ] **Paso 4: commit**

```bash
git add src/app/periodos/[id]/page.tsx
git commit -m "feat: mostrar la validación del docente tutor en /periodos/[id]"
```

---

## Tarea 9: Interfaz en la ficha de la asignatura

**Archivos:**
- Modificar: `src/app/asignaturas/[codigo]/page.tsx`

**Interfaces:**
- Consume: `alternarValidacionContenidistas` (Tarea 6), `puedeValidarDocentes` (Tarea 3),
  `MarcaValidado` (Tarea 7).
- Produce: nada nuevo — es la última pantalla que faltaba.

- [ ] **Paso 1: agregar los imports**

En `src/app/asignaturas/[codigo]/page.tsx`, la línea:
```ts
import { puedeEditarProduccion } from '@/lib/permisos'
```
pasa a:
```ts
import { puedeEditarProduccion, puedeValidarDocentes } from '@/lib/permisos'
```

Agregar además:
```ts
import { MarcaValidado } from '@/components/MarcaValidado'
```

Y extender el import existente desde `./actions`:
```ts
import {
  actualizarAsignatura, crearVariante, definirVariantesRequeridas, desvincularVariante,
  alternarValidacionContenidistas,
} from './actions'
```

- [ ] **Paso 2: calcular el permiso**

Justo después de la línea:
```ts
  const editable = puedeEditarProduccion(s)
```
agregar:
```ts
  const puedeValidar = puedeValidarDocentes(s)
```

- [ ] **Paso 3: mostrar el interruptor o el sello junto al campo Docente**

Buscar el bloque del formulario de producción:

```tsx
        <FormConError className="ficha" action={actualizarAsignatura.bind(null, a.codigo)}>
          <label htmlFor="estado">
            Estado
            <select id="estado" name="estado" defaultValue={a.estado}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e as Estado]}</option>
              ))}
            </select>
          </label>
          <label>Docente <EditorDocentes name="docente" iniciales={a.docentes.map((d) => d.nombre)} etiqueta={a.nombre} /></label>
          <label>Asesor <input name="asesor" defaultValue={a.asesor ?? ''} /></label>
          <Boton>Guardar</Boton>
        </FormConError>
```

y agregar el interruptor de validación inmediatamente después de esa etiqueta de
Docente, y la marca de sólo lectura cuando no se puede validar:

```tsx
        <FormConError className="ficha" action={actualizarAsignatura.bind(null, a.codigo)}>
          <label htmlFor="estado">
            Estado
            <select id="estado" name="estado" defaultValue={a.estado}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e as Estado]}</option>
              ))}
            </select>
          </label>
          <label>
            Docente <EditorDocentes name="docente" iniciales={a.docentes.map((d) => d.nombre)} etiqueta={a.nombre} />
            {!puedeValidar && a.contenidistasValidados && <MarcaValidado />}
          </label>
          <label>Asesor <input name="asesor" defaultValue={a.asesor ?? ''} /></label>
          <Boton>Guardar</Boton>
        </FormConError>

        {puedeValidar && (
          <FormConError action={alternarValidacionContenidistas.bind(null, a.codigo)} className="en-linea">
            <Boton className={a.contenidistasValidados ? 'quitar' : undefined} enCurso="…">
              {a.contenidistasValidados ? 'Quitar validación de contenidistas' : 'Validar contenidistas'}
            </Boton>
          </FormConError>
        )}
```

- [ ] **Paso 4: typecheck**

```bash
npx tsc --noEmit
```
Esperado: sin errores.

- [ ] **Paso 5: commit**

```bash
git add src/app/asignaturas/[codigo]/page.tsx
git commit -m "feat: interruptor de validación de contenidistas en la ficha de asignatura"
```

---

## Tarea 10: Verificación completa

**Archivos:** ninguno (sólo verificación).

**Interfaces:** ninguna — esta tarea confirma que todo lo anterior encaja.

- [ ] **Paso 1: suite completa**

```bash
npx vitest run
```
Esperado: todos los test files en verde, incluidos los nuevos de `docentes.test.ts` y
`permisos.test.ts`.

- [ ] **Paso 2: build de producción**

```bash
npm run build
```
Esperado: compila sin errores, incluye `/planificar`, `/periodos/[id]` y
`/asignaturas/[codigo]` en la lista de rutas.

- [ ] **Paso 3: verificación en el navegador — docente tutor**

Con el servidor de desarrollo local corriendo y una sesión con rol `unidad` (o `admin`):
1. Entrar a `/planificar`, abrir una celda con al menos un docente tutor cargado.
2. Confirmar que aparece el botón **Validar docente tutor** (o **Quitar validación** si
   ya estaba validado de una prueba anterior).
3. Apretarlo, confirmar que el resumen (`<summary>`) pasa a mostrar el `✓` y que el botón
   cambia a **Quitar validación**.
4. Cambiar el nombre del docente tutor en el mismo formulario y guardar. Confirmar que
   el `✓` desaparece del resumen sin haber tocado el botón de validar.
5. Con una sesión de rol `director` o `sied`, entrar a la misma pantalla y confirmar que
   no aparece ningún botón de validar, sólo la marca `✓ Validado` cuando corresponda (en
   el párrafo de sólo lectura, si `editable` es falso para ese rol) o el `✓` en el
   resumen (si puede editar la carrera pero no validar).

- [ ] **Paso 4: verificación en el navegador — contenidistas**

Con una sesión `unidad` o `admin`:
1. Entrar a `/asignaturas/[codigo]` de una asignatura con al menos un docente cargado.
2. Confirmar que aparece **Validar contenidistas**, apretarlo, confirmar que cambia a
   **Quitar validación de contenidistas**.
3. Cambiar el campo Docente y guardar. Confirmar que la validación se apagó (el botón
   vuelve a decir **Validar contenidistas**).
4. Con una sesión `sied`, entrar a la misma ficha y confirmar que no hay ningún botón de
   validar, y que si está validado aparece la marca `✓ Validado` de sólo lectura junto al
   campo Docente.

- [ ] **Paso 5: confirmar que el resto de las pantallas no se rompió**

Navegar `/periodos/[id]` de un período con aperturas y confirmar que el docente tutor se
sigue viendo bien, con la marca si corresponde.

- [ ] **Paso 6: aplicar la migración en producción**

Cuando se suba este trabajo (`git push`), el `buildCommand` de `vercel.json` corre
`prisma migrate deploy` solo — no hace falta ningún paso manual contra la base de
producción, a diferencia de una variable de entorno nueva. Confirmar después del deploy,
por ejemplo consultando de sólo lectura contra `.env.produccion` (como en sesiones
anteriores), que `Apertura` y `Asignatura` tienen las columnas nuevas.

- [ ] **Paso 7: commit final si quedó algo suelto**

Si algún paso de verificación encontró un ajuste menor, commitearlo por separado con un
mensaje que describa qué se corrigió y por qué.
