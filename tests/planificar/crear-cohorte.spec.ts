// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Crear una cohorte nueva de prueba', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar y seleccionar la carrera ZZZ_TEST_CARRERA
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    // 2. Crear una cohorte nueva de prueba — nombre fijo (no con timestamp): no hay forma de
    // borrar cohortes desde la interfaz, así que una nueva por corrida las va acumulando para
    // siempre. Si ya existe de una corrida anterior, no hace falta volver a crearla.
    const nombreCohorte = 'ZZZ_TEST_COHORTE_TMP';
    const yaExiste = await page.getByRole('rowheader', { name: new RegExp(`^${nombreCohorte}\\b`) }).isVisible().catch(() => false);
    if (!yaExiste) {
      await page.getByRole('textbox', { name: 'Agregar otra cohorte, por' }).fill(nombreCohorte);
      await page.getByRole('button', { name: 'Crear cohorte' }).click();
    }

    // expect: la cohorte está en la grilla
    await expect(page.getByRole('rowheader', { name: new RegExp(`^${nombreCohorte}\\b`) })).toBeVisible();
  });
});
