// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Períodos', () => {
  test('Entrar al detalle de un período', async ({ page }) => {
    // 1. Iniciar sesión, navegar a /periodos y hacer clic en el período ZZZ_TEST_PERIODO_2027
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/periodos');
    await page.getByRole('link', { name: 'ZZZ_TEST_PERIODO_2027' }).click();
    await page.waitForURL(/\/periodos\/\d+/);

    // expect: navega a /periodos/[id]
    expect(page.url()).toMatch(/\/periodos\/\d+/);

    // expect: se muestra el detalle del período
    await expect(page.getByRole('heading', { name: 'ZZZ_TEST_PERIODO_2027 ·' })).toBeVisible();
  });
});
