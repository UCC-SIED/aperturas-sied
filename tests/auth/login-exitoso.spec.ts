// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Autenticación (Login)', () => {
  test('Login exitoso con credenciales válidas', async ({ page }) => {
    // 1. Navegar a /ingresar
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await expect(page.getByRole('textbox', { name: 'Correo institucional' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();

    // 2. Completar el campo de correo con zzz.test.e2e@ucc.edu.ar
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');

    // 3. Completar el campo de contraseña con ZzzTest2026!Playwright
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');

    // 4. Enviar el formulario de ingreso
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL('https://aperturas-sied.vercel.app/panel');
    await expect(page.getByRole('heading', { name: 'Avance por carrera' })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Secciones' });
    for (const seccion of ['Panel', 'Planificar', 'Períodos', 'Asignaturas', 'Producción', 'Aulas a preparar', 'Administración']) {
      await expect(nav.getByRole('link', { name: seccion })).toBeVisible();
    }
  });
});
