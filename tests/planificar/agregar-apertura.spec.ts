// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Agregar una apertura de ZZZ_TEST_ASIGNATURA en un período', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar filtrando por ZZZ_TEST_CARRERA
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    // 2. En la celda de ZZZ_TEST_COHORTE para algún período disponible, agregar una apertura eligiendo ZZZ_TEST_ASIGNATURA (código ZZZTEST001)
    const quitarButton = page.getByRole('button', { name: 'Quitar ZZZ_TEST_ASIGNATURA' });
    if (await quitarButton.isVisible().catch(() => false)) {
      await quitarButton.click();
    }
    await page.getByLabel('Agregar asignatura a ZZZ_TEST_COHORTE en Bimestral_Octubre_2026').selectOption(['ZZZTEST001']);
    await page.getByRole('cell', { name: 'ZZZ_TEST_ASIGNATURA Agregar' }).getByRole('button').click();

    // expect: la celda ahora muestra ZZZ_TEST_ASIGNATURA
    await expect(page.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();

    // 3. Recargar la página con el mismo filtro
    await page.goto('https://aperturas-sied.vercel.app/planificar?carrera=15');

    // expect: la apertura sigue visible tras recargar
    await expect(page.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();
  });
});
