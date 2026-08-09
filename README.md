# Aperturas SIED

Sistema de gestión de aperturas de aulas en Canvas LMS para el SIED (UCC). Reemplaza como fuente única a las planillas de Posgrado y Educación y al tablero de contratación.

- **Diseño (objetivo, alcances y límites):** [docs/2026-08-08-gestion-aperturas-design.md](docs/2026-08-08-gestion-aperturas-design.md)
- **Plan de implementación Fase 1:** [docs/2026-08-08-aperturas-f1.md](docs/2026-08-08-aperturas-f1.md)

## Qué hace hoy

**Planificar** (`/planificar`) — la pantalla principal. Un tablero por carrera: a la izquierda las asignaturas del plan de estudios que todavía no tienen período, y después una columna por período próximo. Cada dirección elige qué abre en cada período, y mueve o quita cuando la producción no llega. Cada tarjeta muestra el semáforo, así la decisión se toma viendo si el aula está lista. Abajo queda el registro de los últimos movimientos.

**Períodos** (`/periodos` y `/periodos/[id]`) — el calendario completo y, dentro de cada período, qué abre agrupado por carrera con semáforo, docente, asesor y cohortes.

**Asignaturas** (`/asignaturas` y `/asignaturas/[codigo]`) — catálogo con búsqueda y la ficha de cada una: estado de producción, planes donde figura con su orden, todas sus aperturas con el ciclo de fechas, e historial de cambios.

**Producción** (`/produccion`) — el pipeline agrupado por estado con la próxima apertura de cada asignatura. Sólo para el equipo SIED.

### Quién ve qué

| Rol | Puede |
|---|---|
| **Equipo SIED** | Todo: planificar cualquier carrera, editar estados de producción, docentes y asesores |
| **Dirección de carrera** | Planificar sus carreras (agregar, mover, quitar aperturas). Ve el estado de producción pero no lo edita. No ve otras carreras |
| **Consulta** | Sólo lectura |

El ingreso hoy es eligiendo usuario en `/ingresar`; cuando se conecte Google el paso desaparece y se entra con la cuenta institucional. Los usuarios se cargan con `npx tsx migracion/usuarios.ts` (editar la lista en ese archivo).

### Semáforo

### Semáforo

| Color | Significado |
|---|---|
| Lista (verde) | Estado finalizada |
| En riesgo (amarillo) | En maquetación o revisión y la inscripción abre dentro de 30 días |
| No llega (rojo) | Etapa anterior a maquetación y la inscripción abre dentro de 30 días |
| Sin riesgo aún (gris) | Falta más de 30 días o no hay fecha de inscripción |

## Desarrollo local

```bash
npm install
npx prisma migrate dev
npm run dev
```

Datos de prueba: `npx tsx migracion/demo.ts` seguido de `npx tsx migracion/usuarios.ts`. Tests: `npm test`.

Las transversales son el caso delicado del sistema (una asignatura, un código, varias carreras, una sola apertura). Esa lógica vive en `src/lib/planificacion.ts` y está cubierta por `tests/planificacion.test.ts` — conviene correr los tests antes de tocarla.

## Migración de las planillas

1. Exportar a Excel desde Google Sheets (Archivo → Descargar → Microsoft Excel) y guardar en `migracion/input/` como `posgrado.xlsx` y `educacion.xlsx`.
2. Exportar el respaldo JSON del tablero de contratación y guardarlo como `migracion/input/tablero.json`.
3. Correr:

```bash
npm run migrar
```

Deja `migracion/reporte-migracion.md` con todo lo que hay que mirar a ojo:

| Sección | Qué junta |
|---|---|
| Filas sin código | No se cargan: sin código no hay clave de asignatura |
| Sin período asignable | Se cargó la asignatura pero su fecha no cae en ningún período |
| Nombres en conflicto | Un mismo código con nombres distintos entre planillas (gana el más largo) |
| Fechas incoherentes | **Se cargan igual**, pero el orden del ciclo es imposible |

Las planillas vienen con errores de carga, sobre todo en los períodos más recientes. La migración no los corrige sola ni los descarta: los carga y los deja listados con el problema concreto (por ejemplo "la inscripción abre después de empezar el cursado", "el AFI vence antes de abrir", "hay fechas con años imposibles"). Corregirlos es una decisión tuya, no del script.

La migración es idempotente: correrla dos veces no duplica datos, así que se puede corregir la planilla y volver a correrla.

### Períodos de Educación

La planilla de Educación no tiene columna de período, solo fechas por fila. La migración los genera agrupando por fecha de inicio **y duración**: un bimestral y un cuatrimestral que arrancan el mismo día son dos períodos distintos, porque cierran y rinden AFI en fechas diferentes.

## Despliegue (Supabase + Vercel)

1. **Base de datos**: crear un proyecto gratuito en [supabase.com](https://supabase.com). En Project Settings → Database copiar la cadena de conexión con pooling (puerto 6543) para `DATABASE_URL` y la directa (puerto 5432) para `DIRECT_URL`.
2. **Cambiar el motor** en `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Borrar `prisma/migrations/` (son de SQLite) y correr `npx prisma migrate dev --name init` apuntando a Supabase.

3. **Poblar**: `npm run migrar` con los archivos en `migracion/input/`.
4. **Publicar**: subir el repo a GitHub, importarlo en [vercel.com](https://vercel.com) y cargar las variables de entorno `DATABASE_URL`, `DIRECT_URL`, `ACCESO_USUARIO` y `ACCESO_CLAVE`. Deploy.
5. Compartir la URL con el equipo SIED.

### Acceso

En Fase 1 el acceso es por usuario y clave únicos (variables `ACCESO_USUARIO` y `ACCESO_CLAVE`), suficiente para el equipo SIED. Si no están definidas, la app no pide credenciales — cómodo en local, nunca en producción.

La Fase 2 lo reemplaza por ingreso con cuenta Google institucional y roles diferenciados (SIED, director de carrera, consulta).

## Estructura

```
src/lib/          lógica pura con tests (semáforo, normalización, inferencia de períodos)
src/app/          páginas (App Router) y server actions
migracion/        parsers de las fuentes originales, cargador y CLI
tests/            vitest
prisma/           esquema y migraciones
```
