# Plan de Pruebas E2E — Gestión de Asignaturas SIED

## Application Overview

**Aviso metodológico:** Este plan fue elaborado a partir de la especificación funcional detallada provista por el equipo SIED (rutas, roles, datos de prueba y flujos descritos en el pedido), ya que la exploración interactiva en vivo del sitio (https://aperturas-sied.vercel.app) no pudo completarse en este entorno: el navegador Chromium gestionado por Playwright falló al iniciarse (`browserType.launch: spawn UNKNOWN`) en la máquina de trabajo, un problema local de entorno (posible bloqueo de antivirus/permisos sobre `chrome.exe`) no relacionado con la aplicación bajo prueba. Antes de automatizar, el equipo de QA debe abrir cada pantalla y ajustar selectores (roles ARIA, texto exacto de botones/etiquetas, IDs de test) a los que arroje el DOM real; los pasos aquí descritos están redactados en términos funcionales (qué hacer / qué verificar) precisamente para que sean independientes de esa implementación de detalle.

**Aplicación bajo prueba:** Gestión de Asignaturas SIED (Next.js), sistema de la Universidad Católica de Córdoba para administrar la apertura de aulas virtuales (Canvas LMS) y el seguimiento de producción de contenido académico. Roles: Administración, Equipo SIED, Dirección de carrera, Unidad académica, Consulta.

**Cuenta de prueba (rol Administración, ve y edita todo):**
- Correo: `zzz.test.e2e@ucc.edu.ar`
- Contraseña: `ZzzTest2026!Playwright`

**Datos de prueba dedicados en producción (usar siempre estos, nunca datos reales):**
- Carrera: `ZZZ_TEST_CARRERA` (unidad Educación)
- Cohorte: `ZZZ_TEST_COHORTE` (dentro de esa carrera)
- Asignatura: `ZZZ_TEST_ASIGNATURA`, código `ZZZTEST001` (ya en el plan de esa carrera)

**Convenciones generales:**
- Todo usuario nuevo creado durante las pruebas debe usar el prefijo de correo `zzz.test.` (ej. `zzz.test.director@ucc.edu.ar`) para quedar identificable y descartable.
- Toda apertura/cohorte/cambio de estado o docente que un test necesite crear debe hacerse exclusivamente sobre `ZZZ_TEST_CARRERA` / `ZZZ_TEST_COHORTE` / `ZZZ_TEST_ASIGNATURA`.
- Se asume estado limpio de sesión al inicio de cada test (sin cookies/tokens previos) salvo que el propio test inicie sesión como parte de sus pasos.
- Cada test es independiente: si depende de datos creados por otro flujo (p. ej. una apertura para poder moverla), el propio test debe crearlos primero en sus pasos, o el plan lo indica explícitamente como precondición a verificar/crear.
- La suite de Permisos requiere una cuenta de prueba adicional con rol "Consulta" que este plan NO crea (se indica como prerrequisito manual para el equipo QA).

## Test Scenarios

### 1. Autenticación (Login)

**Seed:** `tests/seed.spec.ts`

#### 1.1. Login exitoso con credenciales válidas

**File:** `tests/auth/login-exitoso.spec.ts`

**Steps:**
  1. Navegar a /ingresar
    - expect: Se muestra el formulario de login con campos de correo y contraseña y un botón para ingresar
    - expect: No hay sesión iniciada (no se ven menús protegidos)
  2. Completar el campo de correo con zzz.test.e2e@ucc.edu.ar
  3. Completar el campo de contraseña con ZzzTest2026!Playwright
  4. Enviar el formulario de ingreso
    - expect: El usuario es redirigido a /panel
    - expect: Se muestra el resumen de avance por carrera
    - expect: La navegación muestra las secciones habilitadas para el rol Administración (Planificar, Períodos, Asignaturas, Producción, Preparar, Admin)

#### 1.2. Login con contraseña incorrecta

**File:** `tests/auth/login-password-incorrecta.spec.ts`

**Steps:**
  1. Navegar a /ingresar
  2. Completar el correo con zzz.test.e2e@ucc.edu.ar y la contraseña con un valor incorrecto (ej. 'ContraseniaIncorrecta123')
  3. Enviar el formulario
    - expect: Se muestra un mensaje de error indicando que el correo o la contraseña son incorrectos
    - expect: El usuario permanece en /ingresar
    - expect: No se crea ninguna sesión (recargar /panel debería volver a pedir login)
  4. Corregir la contraseña con el valor correcto y reintentar el envío
    - expect: El login se completa correctamente y redirige a /panel, confirmando que el formulario sigue siendo utilizable tras el error

#### 1.3. Login con correo inexistente

**File:** `tests/auth/login-correo-inexistente.spec.ts`

**Steps:**
  1. Navegar a /ingresar
  2. Completar el correo con zzz.test.noexiste@ucc.edu.ar y cualquier contraseña
  3. Enviar el formulario
    - expect: Se muestra un mensaje de error (idealmente igual o similar al de contraseña incorrecta, sin confirmar si el correo existe)
    - expect: El usuario permanece en /ingresar sin sesión iniciada

### 2. Recuperar contraseña

**Seed:** `tests/seed.spec.ts`

#### 2.1. Pedido de reinicio con correo válido

**File:** `tests/auth/recuperar-correo-valido.spec.ts`

**Steps:**
  1. Navegar a /recuperar
    - expect: Se muestra un formulario para solicitar el reinicio de contraseña con un campo de correo
  2. Completar el correo con zzz.test.e2e@ucc.edu.ar y enviar el formulario
    - expect: Se muestra un mensaje de confirmación genérico (ej. 'Si el correo existe, se generó un pedido de reinicio') sin indicar explícitamente que el correo fue encontrado
    - expect: No se envía ningún enlace de recuperación por correo, ya que el sistema deja el pedido pendiente para que Administración lo gestione
  3. Iniciar sesión como zzz.test.e2e@ucc.edu.ar en /ingresar y navegar a /admin, sección de pedidos de contraseña pendientes
    - expect: El pedido recién generado aparece listado con el correo zzz.test.e2e@ucc.edu.ar y una fecha/hora reciente

#### 2.2. Pedido de reinicio con correo inexistente

**File:** `tests/auth/recuperar-correo-inexistente.spec.ts`

**Steps:**
  1. Navegar a /recuperar
  2. Completar el correo con zzz.test.noexiste@ucc.edu.ar y enviar el formulario
    - expect: Se muestra exactamente el mismo mensaje de confirmación genérico que en el caso de correo válido, sin ninguna diferencia de texto, estilo o comportamiento que permita inferir que el correo no existe en el sistema
  3. Iniciar sesión como Administración y revisar /admin, sección de pedidos pendientes
    - expect: No aparece ningún pedido pendiente asociado a zzz.test.noexiste@ucc.edu.ar, confirmando que el mensaje idéntico no refleja una creación real de pedido para correos inexistentes

#### 2.3. Validación de formulario en recuperar contraseña

**File:** `tests/auth/recuperar-validacion.spec.ts`

**Steps:**
  1. Navegar a /recuperar
  2. Enviar el formulario sin completar el campo de correo
    - expect: Se muestra una validación indicando que el campo es obligatorio y no se envía la solicitud
  3. Completar el campo de correo con un valor con formato inválido (ej. 'no-es-un-correo') y enviar
    - expect: Se muestra una validación de formato de correo inválido y no se envía la solicitud

### 3. Planificar

**Seed:** `tests/seed.spec.ts`

#### 3.1. Ver la grilla de cohorte x período de ZZZ_TEST_CARRERA

**File:** `tests/planificar/ver-grilla.spec.ts`

**Steps:**
  1. Iniciar sesión con zzz.test.e2e@ucc.edu.ar / ZzzTest2026!Playwright
  2. Navegar a /planificar y seleccionar/filtrar la carrera ZZZ_TEST_CARRERA
    - expect: Se muestra la grilla con la cohorte ZZZ_TEST_COHORTE como fila/columna y los períodos en el eje opuesto
    - expect: Las celdas muestran las aperturas ya existentes para esa cohorte, si las hay

#### 3.2. Agregar una apertura de ZZZ_TEST_ASIGNATURA en un período

**File:** `tests/planificar/agregar-apertura.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar y filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE
  2. En la celda correspondiente a un período disponible, usar la acción de agregar apertura
    - expect: Se abre un selector/diálogo para elegir la asignatura a abrir
  3. Buscar y seleccionar ZZZ_TEST_ASIGNATURA (código ZZZTEST001) y confirmar
    - expect: La celda del período elegido ahora muestra una tarjeta/chip de ZZZ_TEST_ASIGNATURA
    - expect: Se muestra una confirmación de éxito (toast o mensaje similar)
  4. Recargar la página /planificar con el mismo filtro aplicado
    - expect: La apertura recién creada persiste y sigue visible en la misma celda

#### 3.3. Mover una apertura de ZZZ_TEST_ASIGNATURA a otro período

**File:** `tests/planificar/mover-apertura.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar, filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE y crear una apertura de ZZZ_TEST_ASIGNATURA en un Período A (si no existe ya una de un test previo)
    - expect: La apertura queda visible en la celda del Período A
  2. Mover la tarjeta de la apertura desde la celda del Período A hacia la celda de un Período B (arrastrar y soltar, o mediante una acción de menú 'mover' si la interfaz la ofrece)
    - expect: Se confirma la acción de mover (diálogo de confirmación o feedback inmediato)
  3. Observar el estado final de la grilla
    - expect: La apertura ya no aparece en la celda del Período A
    - expect: La apertura aparece ahora en la celda del Período B

#### 3.4. Quitar una apertura de la grilla

**File:** `tests/planificar/quitar-apertura.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar, filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE y crear una apertura de ZZZ_TEST_ASIGNATURA en un período (si no existe ya una)
    - expect: La apertura queda visible en la celda correspondiente
  2. Abrir las opciones de la apertura y seleccionar quitar/eliminar, confirmando el diálogo si lo solicita
    - expect: Se muestra confirmación de éxito
  3. Observar la celda del período
    - expect: La celda queda vacía/disponible, sin la tarjeta de ZZZ_TEST_ASIGNATURA

#### 3.5. Crear una cohorte nueva de prueba

**File:** `tests/planificar/crear-cohorte.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar y seleccionar la carrera ZZZ_TEST_CARRERA
  2. Usar la acción de crear/nueva cohorte
    - expect: Se abre un formulario para los datos de la nueva cohorte
  3. Completar el nombre con un valor único e identificable como de prueba, por ejemplo 'ZZZ_TEST_COHORTE_<marca de tiempo>', y completar cualquier otro campo obligatorio (fechas, etc.)
  4. Guardar la nueva cohorte
    - expect: La nueva fila/columna de cohorte aparece inmediatamente en la grilla de ZZZ_TEST_CARRERA
    - expect: Se muestra confirmación de éxito

#### 3.6. Validaciones al agregar una apertura

**File:** `tests/planificar/agregar-apertura-validacion.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar, filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE y abrir el diálogo de agregar apertura en una celda
  2. Intentar confirmar sin seleccionar ninguna asignatura
    - expect: Se muestra una validación indicando que debe seleccionarse una asignatura y no se crea ninguna apertura
  3. Seleccionar ZZZ_TEST_ASIGNATURA y confirmar para crearla, luego repetir la acción de agregar apertura sobre la misma celda/período intentando cargar ZZZ_TEST_ASIGNATURA nuevamente
    - expect: El sistema impide la duplicación (bloquea con mensaje explicativo, o la asignatura ya no aparece disponible para seleccionar en esa celda)

### 4. Períodos

**Seed:** `tests/seed.spec.ts`

#### 4.1. Ver el listado/calendario de períodos

**File:** `tests/periodos/ver-listado.spec.ts`

**Steps:**
  1. Iniciar sesión y navegar a /periodos
    - expect: Se muestra un listado o calendario de períodos con sus nombres y rangos de fechas

#### 4.2. Entrar al detalle de un período

**File:** `tests/periodos/ver-detalle.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /periodos y hacer clic sobre un período de la lista
    - expect: Se navega a /periodos/[id]
    - expect: Se muestra el detalle del período con la lista de aperturas asociadas y sus fechas

#### 4.3. Editar la fecha de una apertura puntual (excepción sobre el período)

**File:** `tests/periodos/editar-excepcion-fecha.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /planificar y asegurar que exista una apertura de ZZZ_TEST_ASIGNATURA para ZZZ_TEST_COHORTE dentro de algún período (crearla si no existe)
  2. Navegar a /periodos, entrar al detalle de ese mismo período y localizar la fila de la apertura de ZZZ_TEST_ASIGNATURA
    - expect: La apertura aparece con las fechas por defecto del período
  3. Abrir la edición de fecha de esa apertura puntual y cambiarla a una fecha distinta de la fecha general del período
  4. Guardar el cambio
    - expect: La apertura muestra ahora la fecha personalizada/de excepción, visualmente distinguida (por ejemplo con una marca o etiqueta de 'excepción')
    - expect: El resto de las aperturas del mismo período conservan las fechas por defecto sin verse afectadas
  5. Recargar la página de detalle del período
    - expect: La fecha de excepción persiste tras recargar

### 5. Asignaturas

**Seed:** `tests/seed.spec.ts`

#### 5.1. Buscar en el catálogo de asignaturas

**File:** `tests/asignaturas/buscar-catalogo.spec.ts`

**Steps:**
  1. Iniciar sesión y navegar a /asignaturas
    - expect: Se muestra el catálogo completo de asignaturas
  2. Escribir 'ZZZ_TEST_ASIGNATURA' (o el código 'ZZZTEST001') en el buscador
    - expect: El listado se filtra mostrando únicamente ZZZ_TEST_ASIGNATURA
  3. Limpiar el campo de búsqueda
    - expect: El catálogo completo vuelve a mostrarse

#### 5.2. Entrar a la ficha de ZZZ_TEST_ASIGNATURA y cambiar su estado de producción

**File:** `tests/asignaturas/ficha-cambiar-estado.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /asignaturas y hacer clic en ZZZ_TEST_ASIGNATURA
    - expect: Se navega a /asignaturas/ZZZTEST001
    - expect: La ficha muestra el estado de producción actual, docentes, planes en los que está incluida y aperturas asociadas
  2. Registrar el estado de producción actual y cambiarlo a un valor distinto y válido usando el control correspondiente
  3. Guardar el cambio si el control lo requiere
    - expect: La ficha refleja inmediatamente el nuevo estado de producción
    - expect: Al recargar la página, el nuevo estado persiste

#### 5.3. Cargar un docente en la ficha de ZZZ_TEST_ASIGNATURA

**File:** `tests/asignaturas/ficha-cargar-docente.spec.ts`

**Steps:**
  1. Iniciar sesión y navegar a /asignaturas/ZZZTEST001
  2. Usar la acción de agregar/cargar docente en la sección de docentes de la ficha
    - expect: Se abre un formulario o selector para los datos del docente
  3. Completar los datos del docente de prueba (por ejemplo nombre 'Docente ZZZ Test' y correo si se solicita) y confirmar
    - expect: El docente aparece listado en la sección de docentes de la ficha
    - expect: Se muestra confirmación de éxito

#### 5.4. Buscar un término sin resultados en el catálogo

**File:** `tests/asignaturas/buscar-sin-resultados.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /asignaturas y buscar un término inexistente, por ejemplo 'zzzznoexiste999'
    - expect: Se muestra un estado vacío/mensaje de 'sin resultados', sin errores en la interfaz ni resultados incorrectos

### 6. Producción

**Seed:** `tests/seed.spec.ts`

#### 6.1. Ver el pipeline de producción agrupado por estado

**File:** `tests/produccion/ver-pipeline.spec.ts`

**Steps:**
  1. Iniciar sesión con la cuenta de prueba (rol Administración) y navegar a /produccion
    - expect: Se muestra el pipeline con columnas o grupos por cada estado de producción
    - expect: Cada asignatura aparece agrupada bajo su estado actual, incluyendo ZZZ_TEST_ASIGNATURA bajo el estado que se le haya asignado en pruebas previas

### 7. Aulas a preparar

**Seed:** `tests/seed.spec.ts`

#### 7.1. Ver el listado de aulas a preparar

**File:** `tests/preparar/ver-listado.spec.ts`

**Steps:**
  1. Iniciar sesión con la cuenta de prueba y navegar a /preparar
    - expect: Se muestra el listado de aulas pendientes de armar en Canvas, con los datos de asignatura, apertura y período correspondientes a cada fila

### 8. Admin

**Seed:** `tests/seed.spec.ts`

#### 8.1. Dar de alta un usuario de prueba

**File:** `tests/admin/alta-usuario.spec.ts`

**Steps:**
  1. Iniciar sesión con la cuenta de prueba y navegar a /admin
    - expect: Se muestra la gestión de usuarios, roles, carreras y pedidos de contraseña pendientes
  2. Usar la acción de nuevo usuario/agregar usuario
    - expect: Se abre un formulario de alta
  3. Completar el correo con zzz.test.director@ucc.edu.ar, nombre y un rol inicial, y guardar
    - expect: El nuevo usuario aparece en el listado de usuarios con el correo y rol indicados

#### 8.2. Cambiar el rol del usuario de prueba

**File:** `tests/admin/cambiar-rol.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /admin y asegurar que exista el usuario zzz.test.director@ucc.edu.ar (crearlo si no existe)
  2. Localizar al usuario en el listado y abrir la edición de su rol
  3. Cambiar el rol a 'Dirección de carrera' y guardar
    - expect: El listado de usuarios refleja el nuevo rol para zzz.test.director@ucc.edu.ar

#### 8.3. Asignar una carrera al usuario de prueba

**File:** `tests/admin/asignar-carrera.spec.ts`

**Steps:**
  1. Iniciar sesión, navegar a /admin y asegurar que exista el usuario zzz.test.director@ucc.edu.ar (crearlo si no existe)
  2. Abrir la edición de carreras asignadas para ese usuario y seleccionar ZZZ_TEST_CARRERA
  3. Guardar el cambio
    - expect: ZZZ_TEST_CARRERA queda listada entre las carreras asignadas al usuario zzz.test.director@ucc.edu.ar

#### 8.4. Ver la lista de pedidos de contraseña pendientes

**File:** `tests/admin/pedidos-pendientes.spec.ts`

**Steps:**
  1. Generar un pedido pendiente navegando a /recuperar y solicitando el reinicio para zzz.test.e2e@ucc.edu.ar
  2. Iniciar sesión con la cuenta de prueba y navegar a /admin, sección de pedidos de contraseña pendientes
    - expect: El pedido recién generado aparece en la lista con el correo zzz.test.e2e@ucc.edu.ar y una fecha/hora reciente

### 9. Permisos

**Seed:** `tests/seed.spec.ts`

#### 9.1. El rol Consulta no ve controles de edición ni accede a secciones restringidas

**File:** `tests/permisos/rol-consulta-solo-lectura.spec.ts`

**Steps:**
  1. Ya provisionado: usuario de prueba con rol Consulta — correo zzz.test.consulta@ucc.edu.ar, contraseña ZzzTest2026!Consulta
  2. Iniciar sesión en /ingresar con las credenciales del usuario de prueba de rol Consulta
    - expect: El login es exitoso y redirige a /panel
  3. Navegar a /planificar y filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE
    - expect: La grilla es visible en modo lectura
    - expect: No están presentes (o están deshabilitados) los controles de agregar apertura, mover, quitar y crear cohorte
  4. Navegar a /asignaturas/ZZZTEST001
    - expect: La ficha es visible
    - expect: No están presentes controles para cambiar el estado de producción ni para agregar un docente
  5. Navegar al detalle de un período en /periodos/[id]
    - expect: El detalle es visible en modo lectura
    - expect: No están presentes controles para editar la fecha de una apertura puntual
  6. Intentar navegar directamente por URL a /admin
    - expect: El acceso es denegado o se redirige fuera de la sección (no simplemente oculta en el menú), dado que Admin es exclusivo del rol Administración
  7. Intentar navegar directamente por URL a /produccion y a /preparar
    - expect: El acceso es denegado o redirigido en ambos casos, dado que son exclusivos de Equipo SIED/Administración
