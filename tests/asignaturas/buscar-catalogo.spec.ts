// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Asignaturas', () => {
  test('Buscar en el catálogo de asignaturas', async ({ page }) => {
    // 1. Iniciar sesión y navegar a /asignaturas
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/asignaturas');

    // expect: Se muestra el catálogo completo de asignaturas
    const heading = page.getByRole('heading', { name: /^Asignaturas \(\d+\)$/ });
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('Asignaturas (1)');

    // 2. Escribir 'ZZZ_TEST_ASIGNATURA' (o el código 'ZZZTEST001') en el buscador
    await page.getByRole('textbox', { name: 'Buscar asignatura' }).fill('ZZZ_TEST_ASIGNATURA');
    await page.getByRole('button', { name: 'Buscar' }).click();

    // expect: El listado se filtra mostrando únicamente ZZZ_TEST_ASIGNATURA
    await expect(page.getByRole('heading', { name: 'Asignaturas (1)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();

    // 3. Limpiar el campo de búsqueda
    await page.getByRole('link', { name: 'Limpiar' }).click();

    // expect: El catálogo completo vuelve a mostrarse
    await expect(page.getByRole('textbox', { name: 'Buscar asignatura' })).toHaveValue('');
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('Asignaturas (1)');
    await expect(page.getByRole('link', { name: 'ACREDITACIÓN PARTICIPACIÓN EN ACTIVIDADES DE PROYECCIÓN SOCIAL' })).toBeVisible();
  });
});
