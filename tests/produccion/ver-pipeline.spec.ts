// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Producción', () => {
  test('Ver el pipeline de producción agrupado por estado', async ({ page }) => {
    // 1. Iniciar sesión con la cuenta de prueba (rol Administración) y navegar a /produccion
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/produccion');

    // expect: Se muestra el pipeline con columnas o grupos por cada estado de producción
    await expect(page.getByRole('heading', { name: 'Seguimiento de producción' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contratación' })).toBeVisible();

    // ZZZ_TEST_ASIGNATURA pertenece a ZZZ_TEST_CARRERA: la filtramos para ubicarla en el pipeline
    await page.getByRole('combobox', { name: 'Carrera' }).selectOption({ label: 'ZZZ_TEST_CARRERA (1)' });

    // expect: Cada asignatura aparece agrupada bajo su estado actual, incluyendo ZZZ_TEST_ASIGNATURA bajo el estado que se le haya asignado en pruebas previas
    await expect(page.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();
    const estadoZZZ = page.getByRole('combobox', { name: 'Estado de ZZZ_TEST_ASIGNATURA' });
    await expect(estadoZZZ).toBeVisible();
    // No se fija un estado puntual: otros tests pueden haber cambiado el estado de producción de
    // ZZZ_TEST_ASIGNATURA. Sólo verificamos que quedó agrupada bajo alguno de los estados válidos.
    const estadosValidos = [
      'sin_novedad',
      'contratacion',
      'validacion_docente',
      'contrato',
      'construccion',
      'revision',
      'maquetacion',
      'finalizacion',
    ];
    await expect(estadoZZZ).toHaveValue(new RegExp(`^(${estadosValidos.join('|')})$`));
  });
});
