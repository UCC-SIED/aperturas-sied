// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Períodos', () => {
  test('Ver el listado/calendario de períodos', async ({ page }) => {
    // 1. Iniciar sesión y navegar a /periodos
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/periodos');

    // expect: se muestra un listado de períodos con nombres y fechas (debería aparecer ZZZ_TEST_PERIODO_2027)
    await expect(page.getByRole('link', { name: 'ZZZ_TEST_PERIODO_2027' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '10/01/' })).toBeVisible();
  });
});
