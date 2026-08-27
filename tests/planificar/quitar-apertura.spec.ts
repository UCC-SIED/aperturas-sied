// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Quitar una apertura de la grilla', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar filtrando por ZZZ_TEST_CARRERA, asegurar que exista una apertura de ZZZ_TEST_ASIGNATURA (agregarla si no existe)
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    const cohorteRow = page.getByRole('row', { name: /ZZZ_TEST_COHORTE/ });
    const quitarButton = cohorteRow.getByRole('button', { name: 'Quitar ZZZ_TEST_ASIGNATURA' });
    const yaTieneApertura = await quitarButton.isVisible().catch(() => false);
    if (!yaTieneApertura) {
      await page.getByLabel('Agregar asignatura a ZZZ_TEST_COHORTE en Bimestral_Octubre_2026').selectOption(['ZZZTEST001']);
      await page.getByRole('cell', { name: 'ZZZ_TEST_ASIGNATURA Agregar' }).getByRole('button').click();
    }
    await expect(cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();

    // 2. Quitar esa apertura
    await quitarButton.click();

    // expect: la celda ya no muestra ZZZ_TEST_ASIGNATURA
    await expect(cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).not.toBeVisible();
  });
});
