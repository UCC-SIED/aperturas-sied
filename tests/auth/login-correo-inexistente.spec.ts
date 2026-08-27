// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Autenticación (Login)', () => {
  test('Login con correo inexistente', async ({ page }) => {
    // 1. Navegar a /ingresar
    await page.goto('https://aperturas-sied.vercel.app/ingresar');

    // 2. Completar correo con zzz.test.noexiste@ucc.edu.ar y cualquier contraseña
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.noexiste@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('CualquierContrasenia123');

    // 3. Enviar el formulario
    await page.getByRole('button', { name: 'Ingresar' }).click();
    // expect: se muestra un mensaje de error
    await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
    // expect: sigue en /ingresar sin sesión iniciada
    await expect(page).toHaveURL(/\/ingresar/);
    await page.goto('https://aperturas-sied.vercel.app/panel');
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
