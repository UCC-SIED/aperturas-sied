// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Ver la grilla de cohorte x período de ZZZ_TEST_CARRERA', async ({ page }) => {
    // 1. Iniciar sesión y navegar a /planificar, seleccionar/filtrar la carrera ZZZ_TEST_CARRERA
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    // expect: se muestra la grilla con la cohorte ZZZ_TEST_COHORTE — el nombre exacto,
    // no "ZZZ_TEST_COHORTE_TMP_..." (cohortes temporales que deja otro test por substring)
    await expect(page.getByRole('rowheader', { name: /^ZZZ_TEST_COHORTE(?!_)/ })).toBeVisible();

    // expect: los períodos aparecen como columnas
    await expect(page.getByRole('columnheader', { name: /Bimestral_Octubre_2026/ })).toBeVisible();
  });
});
