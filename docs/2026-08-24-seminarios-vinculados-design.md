# Seminarios vinculados — diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado para implementar
**Autores:** Goni (Tecnología Educativa SIED) + Claude

---

## 1. Contexto y problema

Algunas carreras tienen en su plan un lugar del tipo *Seminario*, con su código. En la
práctica, para cubrir ese lugar se arman **seminarios optativos concretos**, cada uno con
su propio código, su docente y su aula: para un mismo seminario del plan a veces se hacen
dos, a veces tres.

Cuántos hacen falta para dar la correspondencia **se decide seminario por seminario**,
según la carga horaria de cada uno: a veces alcanza con uno, a veces hacen falta los tres.
No hay una regla única.

Hoy el sistema no puede representar nada de esto. `Asignatura` se identifica por código y
tanto la producción como las aperturas cuelgan de ese único código; `PlanItem` ata una
asignatura a una carrera. No existe la idea de "varios códigos que cubren un mismo lugar
del plan", así que esos seminarios optativos, si se cargaran, aparecerían como asignaturas
sueltas: inflarían el total del panel y nadie sabría de dónde vienen.

## 2. Objetivo

Que el sistema sepa que ciertos códigos son variantes de un lugar del plan, para poder
producirlos y abrirlos por separado sin que los números del panel mientan.

**Fuera de alcance, decidido:** este sistema no tiene alumnos —trabaja con cohortes, que
son camadas— así que no registra quién cursó qué ni otorga correspondencias
individuales. Eso vive en Canvas y en el sistema académico. Tampoco deduce la cobertura
sumando cargas horarias.

## 3. Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Qué resuelve el sistema | El vínculo y la producción | Sin alumnos ni correspondencias individuales: ya viven en otro lado y duplicarlos sería peor. |
| Cuántas variantes cubren el lugar | Un número por seminario | La regla se decide caso por caso según la carga horaria. Cualquier regla global estaría mal en la mitad de los casos. |
| El código principal | Conserva su producción y sus aperturas | A veces el seminario se dicta tal cual figura en el plan, sin desdoblarse. |
| Cómo se representa | Autorrelación en `Asignatura` | Ver abajo. |

### Alternativas descartadas

**Un modelo `GrupoSeminario` aparte.** Conceptualmente más prolijo, pero `PlanItem` apunta
hoy a una asignatura: habría que hacer que apunte a una asignatura **o** a un grupo, lo que
en Prisma es un enredo. Y como el principal tiene que poder abrirse igual, seguiría siendo
una asignatura: más máquina para el mismo resultado.

**Una etiqueta de texto** (`grupo: "Seminario Optativo A"`) y agrupar por ese valor. Lo más
rápido de escribir y lo más frágil: un espacio de más parte el grupo en dos, no hay forma
de saber cuál es el principal, y nada impide vincular una asignatura de otra carrera.

## 4. Modelo de datos

Dos campos nuevos en `Asignatura`:

```prisma
  /// El seminario del plan que esta variante ayuda a cubrir. Null en las
  /// asignaturas comunes. Una variante no tiene PlanItem propio: pertenece al
  /// plan a través de su principal.
  principalCodigo    String?
  principal          Asignatura?  @relation("Variantes", fields: [principalCodigo], references: [codigo])
  variantes          Asignatura[] @relation("Variantes")
  /// Cuántas variantes hacen falta para dar por cubierto este lugar del plan.
  /// Sólo significa algo en un principal. Uno es el caso más común.
  variantesRequeridas Int @default(1)
```

Las variantes son `Asignatura` y no un modelo nuevo, así que heredan sin escribir nada el
estado de producción, los docentes, el asesor, las observaciones, las aperturas y las aulas
a preparar.

## 5. Cómo cuenta el panel

Una asignatura **sin** variantes cuenta como hoy: su propio estado.

Una asignatura **con** variantes se considera cubierta si el principal está `finalizacion`
**o** si al menos `variantesRequeridas` de sus variantes lo están. El `o` es lo que sostiene
el caso "a veces se dicta tal cual figura en el plan".

Las variantes **no** engordan el total: los 245 del panel siguen siendo lugares del plan,
no códigos. La lógica vive en `src/lib/seminarios.ts`, separada de las pantallas, para
poder probarla sin navegador.

## 6. Dónde se vinculan

En la ficha de la asignatura (`/asignaturas/[codigo]`), para quien puede editar producción,
una sección **Seminarios vinculados**: la lista de variantes con su estado, el número de
cuántas hacen falta, y un formulario para sumar una nueva.

**El formulario crea la variante**, con su código y su nombre. Se asume que esos códigos no
existen todavía en el sistema: no vienen de las planillas del plan, porque no son parte del
plan.

## 7. Dónde se ven

- **`/produccion`**: cada variante es una fila propia debajo de su principal, con su estado
  editable, sangrada para que se lea la pertenencia.
- **`/planificar`**: el desplegable de "Elegir asignatura" ofrece también las variantes: lo
  que se abre como aula es la variante, no el lugar del plan.
- **`/asignaturas`**: cada variante indica de qué seminario depende.

## 8. Manejo de errores

| Situación | Qué pasa |
|---|---|
| El código de la variante ya existe | Se rechaza con un mensaje que dice cuál. |
| Se intenta vincular una asignatura que ya está en un plan de estudios | Se rechaza: sería sacarla de su lugar del plan. |
| Se intenta vincular una variante a otra variante | Se rechaza: un solo nivel de profundidad. |
| Se intenta vincular una asignatura a sí misma | Se rechaza. |
| `variantesRequeridas` menor que 1 | Se rechaza. |
| Se borra un principal que tiene variantes | El vínculo queda en null y las variantes sobreviven, para no perder producción cargada. |

## 9. Tests

En `tests/seminarios.test.ts`, sobre funciones puras:

- Una asignatura sin variantes cuenta por su propio estado.
- Con `variantesRequeridas: 1` y una variante finalizada, el lugar está cubierto.
- Con `variantesRequeridas: 3` y dos finalizadas, no está cubierto; con tres, sí.
- El principal finalizado cubre el lugar aunque ninguna variante lo esté.
- Las variantes no se cuentan como lugares del plan en el total.

## 10. Fuera de alcance

- Alumnos y correspondencias individuales.
- Deducir la cobertura por carga horaria.
- Variantes de variantes: un solo nivel.
- Que una variante pertenezca a dos seminarios distintos.
