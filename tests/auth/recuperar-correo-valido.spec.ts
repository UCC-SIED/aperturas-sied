// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Recuperar contraseña', () => {
  test('Pedido de reinicio con correo válido', async ({ page }) => {
    // 1. Navegar a /recuperar
    await page.goto('https://aperturas-sied.vercel.app/recuperar');
    // expect: se muestra un formulario para pedir el reinicio con un campo de correo
    await expect(page.getByRole('textbox', { name: 'Correo institucional' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pedir contraseña nueva' })).toBeVisible();

    // 2. Completar el correo con zzz.test.e2e@ucc.edu.ar y enviar
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('button', { name: 'Pedir contraseña nueva' }).click();
    // expect: se muestra un mensaje de confirmación genérico
    await expect(
      page.getByText('Listo. Si ese correo está dado de alta, el equipo SIED ya tiene tu pedido')
    ).toBeVisible();

    // 3. Iniciar sesión como Administración (zzz.test.e2e@ucc.edu.ar / ZzzTest2026!Playwright) y navegar a /admin
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');
    await page.goto('https://aperturas-sied.vercel.app/admin');
    // expect: aparece un pedido pendiente para zzz.test.e2e@ucc.edu.ar
    await expect(page.getByRole('heading', { name: /Pedidos de contraseña/ })).toBeVisible();
    const tablaPedidos = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Lo pidió' }) });
    const fila = tablaPedidos.getByRole('row').filter({ hasText: 'zzz.test.e2e@ucc.edu.ar' });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('ZZZ_TEST_E2E');
  });
});
