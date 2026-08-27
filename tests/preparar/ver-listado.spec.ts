// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Aulas a preparar', () => {
  test('Ver el listado de aulas a preparar', async ({ page }) => {
    // 1. Iniciar sesión con la cuenta de prueba y navegar a /preparar
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/preparar');

    // expect: Se muestra el listado de aulas pendientes de armar en Canvas, con los datos de
    // asignatura, apertura y período correspondientes a cada fila
    await expect(page.getByRole('heading', { name: /^Aulas a preparar \(\d+\)$/ })).toBeVisible();

    const tabla = page.getByRole('table');
    await expect(tabla.getByRole('columnheader', { name: 'Asignatura' })).toBeVisible();
    await expect(tabla.getByRole('columnheader', { name: 'Producción' })).toBeVisible();
    await expect(tabla.getByRole('columnheader', { name: 'Período' })).toBeVisible();
    await expect(tabla.getByRole('columnheader', { name: 'Carreras y cohortes' })).toBeVisible();

    const fila = tabla.getByRole('row', { name: /GESTIÓN ESTRATÉGICA DEL TALENTO/ });
    await expect(fila.getByRole('link', { name: 'GESTIÓN ESTRATÉGICA DEL TALENTO' })).toBeVisible();
    await expect(fila.getByRole('cell', { name: 'Mensual_Septiembre_2026' })).toBeVisible();
    await expect(fila.getByRole('cell', { name: 'Dirección de Empresas — Cohorte Agosto 2026' })).toBeVisible();
  });
});
