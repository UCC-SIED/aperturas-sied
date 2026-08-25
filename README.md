# Gestión de Asignaturas SIED

Sistema de gestión de aperturas de aulas y seguimiento de producción en Canvas LMS para el SIED (UCC). Reemplaza como fuente única a las planillas de Posgrado y Educación y al tablero de contratación.

> Se llamó "Aperturas SIED" hasta el 13/08/2026 — el nombre quedó corto una vez que la pantalla de seguimiento de producción pasó a ser tan central como la de aperturas.

- **Diseño (objetivo, alcances y límites):** [docs/2026-08-08-gestion-aperturas-design.md](docs/2026-08-08-gestion-aperturas-design.md)
- **Plan de implementación Fase 1:** [docs/2026-08-08-aperturas-f1.md](docs/2026-08-08-aperturas-f1.md)
- **Cómo están organizados los datos (para no técnicos):** [docs/2026-08-13-estructura-de-datos.md](docs/2026-08-13-estructura-de-datos.md)
- **Cambios del 13/08/2026 (planificador, períodos, producción):** [docs/2026-08-13-cambios.md](docs/2026-08-13-cambios.md)

## Qué hace hoy

**Planificar** (`/planificar`) — la pantalla principal, una grilla por carrera: **una fila por cohorte y una columna por período**. En cada celda va lo que le toca cursar a esa camada en ese momento.

Está armada así porque la decisión que toma una dirección no es "esta asignatura, ¿cuándo abre?", sino "en septiembre, ¿qué cursa cada cohorte?". Cada camada avanza por el plan a su propio ritmo: la 2025 puede ir por la asignatura 18 mientras la 2026 recién empieza la 7.

En cada celda se elige la asignatura de un desplegable con el plan completo, numerado en su orden. Las que esa cohorte ya cursó aparecen marcadas ("— ya en Mensual_Agosto_2026") pero se pueden agregar igual, por si hay una reapertura. Se puede mover a otro período o quitar, y cada cohorte avisa cuántas materias del plan todavía no tienen ninguna apertura. Si falta una cohorte, se crea desde la misma pantalla.

**Períodos** (`/periodos` y `/periodos/[id]`) — el calendario completo (Próximo/En curso/Cerrado) y, dentro de cada período, qué abre agrupado por carrera con docente, asesor y cohortes — con la opción de corregir las fechas de una apertura puntual si se atrasa respecto al resto.

**Asignaturas** (`/asignaturas` y `/asignaturas/[codigo]`) — catálogo con búsqueda y la ficha de cada una: estado de producción, planes donde figura con su orden, todas sus aperturas con el ciclo de fechas, e historial de cambios.

**Producción** (`/produccion`) — el pipeline agrupado por estado con la próxima apertura de cada asignatura. Sólo para el equipo SIED.

### Quién ve qué

| Rol | Puede |
|---|---|
| **Administración** | Todo lo del equipo SIED, y además da de alta usuarios, cambia roles y asigna carreras desde `/admin` |
| **Equipo SIED** | Planificar cualquier carrera, editar estados de producción, docentes y asesores |
| **Dirección de carrera** | Planificar sus carreras (agregar, mover, quitar aperturas). Ve el estado de producción pero no lo edita. No ve otras carreras |
| **Unidad académica** | Igual que Dirección de carrera, pero para *todas* las carreras de su unidad (Posgrado o Educación) — para cuando no planifica cada dirección por separado sino la unidad entera |
| **Consulta** | Sólo lectura |

Los permisos se gestionan desde **`/admin`**, sin tocar código. `npm run usuarios` sólo sirve para la carga inicial.

## Ingreso

Mientras no esté configurado Google (ver más abajo), se entra con **correo y contraseña**. La primera se la carga administración desde `/admin`; después, si alguien se la olvida, pide el reinicio desde **"¿Olvidaste tu contraseña?"** en `/ingresar` — eso deja un pedido registrado en `/admin`, donde el equipo SIED le fija una contraseña nueva y se la comunica por fuera del sistema (teléfono, mensaje, en persona). Los permisos funcionan igual en los dos modos de ingreso.

Este modo necesita **`AUTH_SECRET`** cargada (ver más abajo cómo generarla), incluso sin Google: sirve para firmar la cookie de sesión, así nadie puede escribir el correo de otra persona a mano y entrar como ella. Sin esa variable, el ingreso con contraseña no funciona.

Además frena los intentos de adivinar una contraseña: al quinto fallo seguido para el mismo correo, ese correo queda bloqueado un rato (1 minuto la primera vez, 5 la segunda, 15 de ahí en más), aunque después se escriba la contraseña correcta. Entrar bien borra el contador.

### Pedido de contraseña (configurar el aviso por correo)

El pedido queda registrado en la base sin depender de ningún correo. Además, se manda un aviso por [Resend](https://resend.com) a `tecnologia.sied@ucc.edu.ar` para que el equipo se entere sin tener que entrar a `/admin` a revisar — no usa el SMTP de la universidad ni ninguna cuenta de correo existente, y si falla, el pedido no se pierde: queda igual en `/admin`.

1. Crear una cuenta gratis en [resend.com](https://resend.com) (hasta 3.000 correos/mes).
2. **API Keys → Create API Key**, copiarla a `RESEND_API_KEY`.
3. Sin verificar un dominio, Resend sólo entrega a la casilla **dueña de la cuenta de Resend**. Si esa cuenta está a nombre de `tecnologia.sied@ucc.edu.ar`, no hay nada más que hacer. Si está a nombre de otro correo, el aviso a `tecnologia.sied` no va a llegar —Resend responde OK y lo descarta en silencio, la misma trampa por la que no funcionaba el flujo anterior—; en ese caso, poné ese correo en `SIED_EMAIL`. Verificar un dominio propio (`ucc.edu.ar`, en **Domains → Add Domain**) libera de la restricción para siempre y queda como mejora a futuro, pero no es necesario para este flujo.
4. Para probar que el envío realmente funciona, `SIED_EMAIL` acepta cualquier dirección: apuntalo a una casilla tuya, pedí un reinicio y mirá si llega. Sin la variable, el aviso va a `tecnologia.sied@ucc.edu.ar`.
5. Sin `RESEND_API_KEY` cargada, el aviso por correo simplemente no sale — el usuario ve la confirmación normal igual y el pedido queda registrado en `/admin`, sin ningún error visible.

## Ingreso con Google

Se entra con la cuenta institucional. Hay dos puertas: el correo tiene que ser del dominio de la universidad **y** la persona tiene que estar dada de alta en `/admin`. Tener una cuenta `@ucc.edu.ar` no alcanza.

### Configurarlo

No hace falta ninguna gestión con la universidad ni cuenta institucional para armar esto — se puede crear con cualquier cuenta de Google. El filtro real de quién entra no pasa por acá: pasa por `/admin` (ver abajo).

En [console.cloud.google.com](https://console.cloud.google.com):

1. Crear un proyecto (o usar uno existente).
2. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo **Externo**, nombre de la app "Gestión de Asignaturas SIED", correo de soporte. No hace falta pedir permisos más allá de los básicos (correo, perfil).
3. **Publicar la app** (botón "Publicar aplicación", estado pasa a "En producción"). Al pedir sólo datos básicos, Google no exige un proceso de verificación — puede quedar así sin límite de tiempo. Eso sí: hasta que alguien verifique el dominio (opcional, en Search Console), la primera vez que alguien entra ve un cartel de "Google no verificó esta app"; con "Avanzado → Ir a Gestión de Asignaturas SIED (no seguro)" sigue sin problema.
4. **Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo *Aplicación web*. Ahí van:

   **Orígenes autorizados de JavaScript**
   ```
   http://localhost:3000
   https://aperturas-sied.vercel.app
   ```

   **URIs de redireccionamiento autorizados**
   ```
   http://localhost:3000/api/auth/callback/google
   https://aperturas-sied.vercel.app/api/auth/callback/google
   ```

5. Copiar el **ID de cliente** y el **secreto** a las variables de entorno:

```
AUTH_GOOGLE_ID="...apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="..."
AUTH_SECRET="una-cadena-larga-al-azar"
AUTH_URL="https://aperturas-sied.vercel.app"
```

`AUTH_SECRET` se genera con `npx auth secret`. En Vercel van las cuatro en Settings → Environment Variables; en local, en el `.env`.

Con esas variables presentes, el sistema usa Google solo: no hace falta cambiar nada más. Cualquiera con cuenta `@ucc.edu.ar` puede intentar entrar, pero sólo ve algo si está dado de alta en `/admin` — ésa es la puerta que importa.

### Semáforo (desactivado)

El sistema calcula un semáforo de riesgo (verde/amarillo/rojo/gris) según el estado de producción y cuánto falta para la inscripción, pero no se muestra en ninguna pantalla — con producción resolviéndose habitualmente la semana antes de arrancar, el umbral fijo de 30 días marcaba todo en rojo sin necesidad. La lógica (`src/lib/semaforo.ts`) queda lista para reactivarse el día que se recalibre el criterio. Detalle en [docs/2026-08-13-cambios.md](docs/2026-08-13-cambios.md).

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

## Las dos bases de datos

No hay ningún motor que instalar.

| Dónde | Motor | Qué es |
|---|---|---|
| Tu máquina | SQLite | El archivo `prisma/dev.db`. Sin servidor ni servicio |
| Publicado | PostgreSQL | Una base en la nube (Supabase). Tampoco se instala: se copia una cadena de conexión |

El esquema es **uno solo** (`prisma/schema.prisma`); lo único que cambia es el motor:

```bash
npm run db:local   # SQLite, para trabajar acá
npm run db:nube    # PostgreSQL, para publicar
```

Cada motor tiene su archivo de variables: `.env` apunta al archivo local y `.env.produccion` guarda las credenciales de Supabase. Los dos están fuera del repositorio. Para correr algo contra la nube, `npm run db:nube` y copiar el contenido de `.env.produccion` al `.env` (o pasar las variables en la línea de comandos); al terminar, `npm run db:local`.

Hace falta porque Vercel borra los archivos del servidor en cada despliegue: si la base fuera un archivo, se perdería todo. Las migraciones versionadas en `prisma/migrations/` están escritas para PostgreSQL; en local y en los tests la estructura se arma con `prisma db push`, que da el mismo resultado.

Para mirar los datos con una interfaz gráfica: `npx prisma studio`.

## Herramientas de consola

Dos scripts para cosas que no se pueden hacer desde la interfaz. Los dos leen
`DATABASE_URL` de `.env.produccion` y se niegan a correr si apunta a un archivo
SQLite. Antes de usarlos, `npm run db:nube && npx prisma generate`; al terminar,
`npm run db:local && npx prisma generate`.

**`scripts/inventario-produccion.mjs`** — sólo lectura. Muestra qué hay cargado:
aperturas por período, cohortes por carrera, cuánto seguimiento de producción
está tocado y los totales de la estructura. Útil antes de decidir cualquier
limpieza.

**`scripts/contrasena-de-emergencia.mjs`** — le fija una contraseña a un usuario
escribiendo directo en la base. Existe para un solo caso: que nadie con rol de
administración pueda entrar, y por lo tanto no haya quién atienda un pedido
desde `/admin`. Es un círculo del que no se sale por la interfaz. Pide la
contraseña por teclado, no la guarda en ningún archivo, y deja el cambio
anotado en la bitácora.

**La forma de no necesitar el segundo es tener siempre más de una persona con
rol Administración.** Con dos, cualquier pedido de contraseña tiene quién lo
resuelva.

## Despliegue (Supabase + Vercel)

Las dos cuentas son gratuitas y se entra con GitHub.

**1. Crear la base.** En [supabase.com](https://supabase.com), nuevo proyecto, región São Paulo. En Project Settings → Database hay dos cadenas de conexión: la de *pooling* (puerto 6543) va en `DATABASE_URL` y la *directa* (puerto 5432) en `DIRECT_URL`. Ponelas en tu `.env` (ver `.env.example`).

**2. Armar y poblar la base:**

```bash
npm run db:nube && npx prisma migrate deploy
```

Después, los datos: `npm run migrar` si tenés las planillas en `migracion/input/`, o `npm run demo` para cargar los planes de estudio oficiales y los usuarios.

**3. Publicar.** Importar el repositorio en [vercel.com](https://vercel.com) y cargar cuatro variables de entorno: `DATABASE_URL`, `DIRECT_URL`, `ACCESO_USUARIO` y `ACCESO_CLAVE` (las dos últimas son la clave de acceso al sitio mientras no esté el ingreso con Google).

**4. Volver a local:** `npm run db:local`, y seguís trabajando con el archivo como siempre.
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
