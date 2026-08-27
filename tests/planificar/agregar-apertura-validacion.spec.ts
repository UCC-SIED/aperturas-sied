// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Validaciones al agregar una apertura', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar filtrando por ZZZ_TEST_CARRERA
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    const cohorteRow = page.getByRole('row', { name: /^ZZZ_TEST_COHORTE\s/ });
    const comboAgregarBimestral = page.getByLabel('Agregar asignatura a ZZZ_TEST_COHORTE en Bimestral_Octubre_2026');
    const celdaBimestral = comboAgregarBimestral.locator('xpath=ancestor::td');

    // 2. En la celda de ZZZ_TEST_COHORTE para un período, agregar ZZZ_TEST_ASIGNATURA (si no está ya agregada)
    const yaAgregada = await cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' }).isVisible().catch(() => false);
    if (!yaAgregada) {
      await comboAgregarBimestral.selectOption(['ZZZTEST001']);
      await celdaBimestral.getByRole('button', { name: 'Agregar' }).click();
    }
    await expect(cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toHaveCount(1);

    // expect (aviso ya en el período): el desplegable anota que ya está en Bimestral_Octubre_2026
    await expect(comboAgregarBimestral.locator('option[value="ZZZTEST001"]')).toHaveText(/ya en Bimestral_Octubre_2026/);

    // 3. Intentar agregarla de nuevo en la misma celda/período
    await comboAgregarBimestral.selectOption(['ZZZTEST001']);
    await celdaBimestral.getByRole('button', { name: 'Agregar' }).click();

    // expect: el sistema no permite duplicarla (no aparece más de una vez en la celda)
    await expect(cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toHaveCount(1);
  });
});
