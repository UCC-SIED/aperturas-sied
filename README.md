# Aperturas SIED

Sistema de gestión de aperturas de aulas en Canvas LMS para el SIED (UCC). Reemplaza como fuente única a las planillas de Posgrado y Educación y al tablero de contratación.

- **Diseño (objetivo, alcances y límites):** [docs/2026-08-08-gestion-aperturas-design.md](docs/2026-08-08-gestion-aperturas-design.md)
- **Plan de implementación Fase 1:** [docs/2026-08-08-aperturas-f1.md](docs/2026-08-08-aperturas-f1.md)

## Qué hace hoy (Fase 1)

- **Períodos** (`/periodos`): calendario de períodos por unidad, con cuántas aperturas tiene cada uno.
- **Tablero del período** (`/periodos/[id]`): qué asignaturas abren, agrupadas por carrera, con semáforo de producción, docente, asesor, fechas y cohortes. Las transversales aparecen bajo cada carrera que las comparte.
- **Ficha de asignatura** (`/asignaturas/[codigo]`): edición de estado, docente y asesor; planes donde figura y todas sus aperturas. Avisa cuando es transversal.
- **Catálogo** (`/asignaturas`): búsqueda por nombre o código.
- **Producción** (`/produccion`): pipeline agrupado por estado, con la próxima apertura de cada asignatura.

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

Datos de prueba: `npx tsx migracion/demo.ts`. Tests: `npm test`.

## Migración de las planillas

1. Exportar a Excel desde Google Sheets (Archivo → Descargar → Microsoft Excel) y guardar en `migracion/input/` como `posgrado.xlsx` y `educacion.xlsx`.
2. Exportar el respaldo JSON del tablero de contratación y guardarlo como `migracion/input/tablero.json`.
3. Correr:

```bash
npm run migrar
```

Deja `migracion/reporte-migracion.md` con lo que no pudo mapear: filas sin código, asignaturas sin período asignable y códigos cuyo nombre difiere entre planillas. Esos casos se revisan a mano — nada se inventa.

La migración es idempotente: correrla dos veces no duplica datos.

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
