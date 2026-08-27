// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Autenticación (Login)', () => {
  test('Login con contraseña incorrecta', async ({ page }) => {
    // 1. Navegar a /ingresar
    await page.goto('https://aperturas-sied.vercel.app/ingresar');

    // 2. Completar correo con zzz.test.e2e@ucc.edu.ar y contraseña con 'ContraseniaIncorrecta123'
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ContraseniaIncorrecta123');

    // 3. Enviar el formulario
    await page.getByRole('button', { name: 'Ingresar' }).click();
    // expect: se muestra un mensaje de error (correo o contraseña incorrectos)
    await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
    // expect: sigue en /ingresar, sin sesión iniciada
    await expect(page).toHaveURL(/\/ingresar/);
    await page.goto('https://aperturas-sied.vercel.app/panel');
    await expect(page).toHaveURL(/\/ingresar/);

    // 4. Corregir la contraseña con el valor correcto (ZzzTest2026!Playwright) y reintentar
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    // expect: el login se completa y redirige a /panel
    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByText('Panel de control').first()).toBeVisible();
  });
});
