// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Recuperar contraseña', () => {
  test('Validación de formulario en recuperar contraseña', async ({ page }) => {
    // 1. Navegar a /recuperar
    await page.goto('https://aperturas-sied.vercel.app/recuperar');

    // 2. Enviar el formulario sin completar el correo
    await page.getByRole('button', { name: 'Pedir contraseña nueva' }).click();
    // expect: no se envía la solicitud (validación de campo obligatorio, HTML5 o similar)
    await expect(page).toHaveURL('https://aperturas-sied.vercel.app/recuperar');
    await expect(page.getByRole('textbox', { name: 'Correo institucional' })).toHaveValue('');
    await expect(page.getByText('Ingresá tu correo institucional y le avisamos al equipo SIED')).toBeVisible();
  });
});
