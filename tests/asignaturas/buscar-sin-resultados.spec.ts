// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Asignaturas', () => {
  test('Buscar un término sin resultados en el catálogo', async ({ page }) => {
    // 1. Iniciar sesión, navegar a /asignaturas y buscar un término inexistente, por ejemplo 'zzzznoexiste999'
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/asignaturas');
    await page.getByRole('textbox', { name: 'Buscar asignatura' }).fill('zzzznoexiste999');
    await page.getByRole('button', { name: 'Buscar' }).click();

    // expect: Se muestra un estado vacío/mensaje de 'sin resultados', sin errores en la interfaz ni resultados
    // incorrectos
    await expect(page.getByRole('heading', { name: 'Asignaturas (0)' })).toBeVisible();
    await expect(page.getByText('Sin resultados para “zzzznoexiste999”.')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
