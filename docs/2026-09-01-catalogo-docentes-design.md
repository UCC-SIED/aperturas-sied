# Catálogo de docentes — diseño

**Fecha:** 2026-09-01
**Estado:** Implementado
**Autores:** Goni (Tecnología Educativa SIED) + Claude

---

## 1. Contexto y problema

El docente tutor de una apertura (`AperturaDocente`) y el o los contenidistas de una
asignatura (`AsignaturaDocente`) eran texto libre: cada persona que carga un nombre lo
escribe a mano, sin ningún catálogo detrás. Resultado: "Juan Pérez", "Pérez, Juan" y
"juan perez" quedaban como registros distintos, y un filtro por docente no podía
agruparlos. En los datos reales ya había casos así (por ejemplo "Valentina Pulcina" y
"Valentina Pulcini").

## 2. Objetivo

1. Un catálogo único de personas (`Docente`), gestionable desde un panel.
2. Que cargar un docente tutor o contenidista sea elegir de ese catálogo (o escribir un
   nombre nuevo, que se suma solo) en vez de texto libre sin ningún control.

## 3. Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Bloquear la carga a sólo elegir de una lista | No | Rompería la carga rápida actual (chips de texto libre). Se agregó un `<datalist>` nativo como sugerencia al tipear, sin bloquear nombres nuevos. |
| Cómo decidir "es la misma persona" | Clave normalizada (minúsculas, sin espacios de sobra) | Un filtro insensible a mayúsculas de la base sólo existe en PostgreSQL; local y tests corren sobre SQLite. Normalizar en código funciona igual en los dos motores. |
| Quién gestiona el catálogo (`/docentes`) | Sólo Administración (`puedeAdministrar`) | Pedido explícito. Cargar un docente al asignarlo (vía `resolverDocentes`) sigue abierto a quien ya podía editar esa carrera/producción — no se restringió el flujo existente. |
| Qué hacer con los nombres ya cargados | Migrarlos automáticamente al catálogo | No se pierde nada: cada nombre distinto se convierte en una persona tal como está escrito. Los duplicados que ya existían desde antes se resuelven a mano desde `/docentes` (fusionar). |
| Traer docentes desde Canvas | Fuera de alcance por ahora | El diseño original del sistema dice explícitamente que no integra con la API de Canvas ("posible fase futura"). Cuando haga falta, es un script chico (`migracion/docentes.ts`) alimentado por una lista extraída aparte. |

## 4. Modelo de datos

```prisma
model Docente {
  id               Int                 @id @default(autoincrement())
  nombre           String              @unique
  claveNormalizada String              @unique
  activo           Boolean             @default(true)
  tutorias         AperturaDocente[]
  contenidos       AsignaturaDocente[]
}
```

`AperturaDocente` y `AsignaturaDocente` cambiaron `nombre String` por `docenteId Int` +
relación (`@@unique` sobre `(padreId, docenteId)` en vez de `(padreId, nombre)`).

Migración `20260825020000_catalogo_docentes`: crea `Docente`, hace el backfill de todos
los nombres ya cargados (agrupando por clave normalizada), y recién después vuelve
`docenteId` obligatorio y borra la columna `nombre` vieja.

## 5. Lógica compartida

`resolverDocentes(prisma, nombres)` en `src/lib/docentes.ts`: da de alta en el catálogo
(si hace falta, por `upsert` sobre `claveNormalizada`) y devuelve los ids, en orden. Es
el único lugar que decide "esto es la misma persona que ya existe" — lo usan los cuatro
puntos que cargan un docente tutor o contenidista (`/planificar`, `/periodos/[id]`, la
ficha de asignatura, `/produccion`) y los scripts de `migracion/` que tocan docentes.

## 6. Panel `/docentes`

Mismo patrón que `/admin` (`FormConError`, `comoResultado`, bitácora en `Cambio`).
Alta, renombrar (corrige en todos lados a la vez, es la fuente única), dar de baja (deja
de sugerirse sin borrar el historial), y fusionar dos entradas duplicadas (reasigna sus
aperturas/asignaturas y borra la sobrante).

## 7. Fuera de alcance

- Integración en vivo con la API de Canvas.
- Fusión automática/heurística de nombres parecidos — la fusión manual alcanza para el
  volumen de datos actual.
