// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Recuperar contraseña', () => {
  test('Pedido de reinicio con correo inexistente', async ({ page }) => {
    // 1. Navegar a /recuperar
    await page.goto('https://aperturas-sied.vercel.app/recuperar');

    // 2. Completar el correo con zzz.test.noexiste@ucc.edu.ar y enviar
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.noexiste@ucc.edu.ar');
    await page.getByRole('button', { name: 'Pedir contraseña nueva' }).click();
    // expect: se muestra el mismo mensaje de confirmación genérico que con un correo válido (no revela si existe)
    await expect(
      page.getByText('Listo. Si ese correo está dado de alta, el equipo SIED ya tiene tu pedido')
    ).toBeVisible();
  });
});
