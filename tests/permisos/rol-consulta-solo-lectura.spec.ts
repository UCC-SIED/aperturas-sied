// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Permisos', () => {
  test('El rol Consulta no ve controles de edición ni accede a secciones restringidas', async ({ page }) => {
    // 1. Ya provisionado: usuario de prueba con rol Consulta — correo zzz.test.consulta@ucc.edu.ar,
    // contraseña ZzzTest2026!Consulta

    // 2. Iniciar sesión en /ingresar con las credenciales del usuario de prueba de rol Consulta
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.consulta@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Consulta');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // expect: El login es exitoso y redirige a /panel
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    // 3. Navegar a /planificar y filtrar por ZZZ_TEST_CARRERA / ZZZ_TEST_COHORTE
    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    // expect: La grilla es visible en modo lectura
    await expect(page.getByRole('heading', { name: 'Planificar aperturas Sólo lectura' })).toBeVisible();
    // El nombre exacto, no "ZZZ_TEST_COHORTE_TMP_..." (cohorte temporal que deja otro test por substring)
    const cohorteRow = page.getByRole('row', { name: /^ZZZ_TEST_COHORTE(?!_)/ });
    await expect(cohorteRow).toBeVisible();

    // expect: No están presentes (o están deshabilitados) los controles de agregar apertura, mover, quitar y crear cohorte
    await expect(page.getByLabel(/Agregar asignatura a ZZZ_TEST_COHORTE/)).not.toBeVisible();
    await expect(cohorteRow.getByRole('button', { name: /Quitar/ })).not.toBeVisible();
    await expect(cohorteRow.getByLabel(/Mover/)).not.toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Agregar otra cohorte, por' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cohorte' })).not.toBeVisible();

    // 4. Navegar a /asignaturas/ZZZTEST001
    await page.goto('https://aperturas-sied.vercel.app/asignaturas/ZZZTEST001');

    // expect: La ficha es visible
    await expect(page.getByRole('heading', { name: 'ZZZ_TEST_ASIGNATURA ZZZTEST001' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Producción' })).toBeVisible();

    // expect: No están presentes controles para cambiar el estado de producción ni para agregar un docente
    await expect(page.getByRole('combobox', { name: 'Estado' })).not.toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Agregar docente a ZZZ_TEST_ASIGNATURA' })).not.toBeVisible();

    // 5. Navegar al detalle de un período en /periodos/[id]
    await page.goto('https://aperturas-sied.vercel.app/periodos/9');

    // expect: El detalle es visible en modo lectura
    await expect(page.getByRole('heading', { name: 'Bimestral_Octubre_2026 · bimestral' })).toBeVisible();
    // <dt>/<dd> (term/definition) no exponen su nombre accesible desde el texto —
    // hay que matchear por contenido en vez de por rol+nombre.
    await expect(page.getByText('Inscripción', { exact: true })).toBeVisible();
    await expect(page.getByText('Cursado', { exact: true })).toBeVisible();

    // expect: No están presentes controles para editar la fecha de una apertura puntual
    await expect(page.getByText('Editar', { exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar fechas' })).not.toBeVisible();

    // 6. Intentar navegar directamente por URL a /admin
    await page.goto('https://aperturas-sied.vercel.app/admin');

    // expect: El acceso es denegado y redirige a /panel con el aviso de sin permiso
    // (no simplemente oculta en el menú), dado que Admin es exclusivo del rol Administración
    await expect(page).toHaveURL('https://aperturas-sied.vercel.app/panel?error=sin-permiso');
    await expect(page.getByText('Tu rol no tiene acceso a esa sección.')).toBeVisible();

    // 7. Intentar navegar directamente por URL a /produccion y a /preparar
    await page.goto('https://aperturas-sied.vercel.app/produccion');

    // expect: El acceso es denegado y redirigido en ambos casos, dado que son exclusivos de Equipo SIED/Administración
    await expect(page).toHaveURL('https://aperturas-sied.vercel.app/panel?error=sin-permiso');

    await page.goto('https://aperturas-sied.vercel.app/preparar');
    await expect(page).toHaveURL('https://aperturas-sied.vercel.app/panel?error=sin-permiso');
  });
});
