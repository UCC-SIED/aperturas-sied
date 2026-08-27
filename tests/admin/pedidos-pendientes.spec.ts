// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test('Ver la lista de pedidos de contraseña pendientes', async ({ page }) => {
    // 1. Generar un pedido pendiente navegando a /recuperar y solicitando el reinicio para
    // zzz.test.e2e@ucc.edu.ar
    await page.goto('https://aperturas-sied.vercel.app/recuperar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('button', { name: 'Pedir contraseña nueva' }).click();
    await expect(
      page.getByText('Listo. Si ese correo está dado de alta, el equipo SIED ya tiene tu pedido')
    ).toBeVisible();

    // 2. Iniciar sesión con la cuenta de prueba y navegar a /admin, sección de pedidos de
    // contraseña pendientes
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/admin');

    // expect: el pedido recién generado aparece en la lista con el correo zzz.test.e2e@ucc.edu.ar
    // y una fecha/hora reciente. La cola es compartida con pedidos reales, y como otros tests ya
    // generan pedidos repetidos para este mismo correo, puede haber varias entradas: alcanza con
    // que aparezca al menos una, sin asumir que es la única fila de la tabla.
    await expect(page.getByRole('heading', { name: /Pedidos de contraseña/ })).toBeVisible();
    const tablaPedidos = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Lo pidió' }) });
    const filasPedido = tablaPedidos.getByRole('row').filter({ hasText: 'zzz.test.e2e@ucc.edu.ar' });
    expect(await filasPedido.count()).toBeGreaterThanOrEqual(1);

    const filaMasReciente = filasPedido.first();
    await expect(filaMasReciente).toBeVisible();
    await expect(filaMasReciente).toContainText('ZZZ_TEST_E2E');
    await expect(filaMasReciente).toContainText('zzz.test.e2e@ucc.edu.ar');
  });
});
