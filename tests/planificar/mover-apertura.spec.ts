// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Planificar', () => {
  test('Mover una apertura de ZZZ_TEST_ASIGNATURA a otro período', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar filtrando por ZZZ_TEST_CARRERA, y asegurar que exista una apertura de ZZZ_TEST_ASIGNATURA para ZZZ_TEST_COHORTE en algún período (agregarla si no existe)
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar');
    await page.getByLabel('Carrera').selectOption(['ZZZ_TEST_CARRERA']);
    await page.waitForURL(/\/planificar\?carrera=\d+/);

    const cohorteRow = page.getByRole('row', { name: /ZZZ_TEST_COHORTE/ });
    const yaTieneApertura = await cohorteRow
      .getByRole('button', { name: 'Quitar ZZZ_TEST_ASIGNATURA' })
      .isVisible()
      .catch(() => false);
    if (!yaTieneApertura) {
      await page.getByLabel('Agregar asignatura a ZZZ_TEST_COHORTE en Bimestral_Octubre_2026').selectOption(['ZZZTEST001']);
      await page.getByRole('cell', { name: 'ZZZ_TEST_ASIGNATURA Agregar' }).getByRole('button').click();
    }

    // Las dos columnas de período de la fila de ZZZ_TEST_COHORTE (celdas fijas por posición)
    const celdaColumna1 = cohorteRow.getByRole('cell').nth(0);
    const celdaColumna2 = cohorteRow.getByRole('cell').nth(1);
    const columna1TieneApertura = await celdaColumna1
      .getByRole('button', { name: 'Quitar ZZZ_TEST_ASIGNATURA' })
      .isVisible()
      .catch(() => false);
    const celdaOrigen = columna1TieneApertura ? celdaColumna1 : celdaColumna2;
    const celdaDestino = columna1TieneApertura ? celdaColumna2 : celdaColumna1;

    // expect: La apertura queda visible en la celda del Período A
    await expect(celdaOrigen.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();

    // 2. Usar la acción de mover esa apertura a otro período distinto
    await celdaOrigen.getByLabel('Mover ZZZ_TEST_ASIGNATURA').selectOption({ index: 1 });
    await celdaOrigen.getByRole('button', { name: 'Mover' }).click();

    // 3. Observar el estado final de la grilla
    // expect: la apertura ya no está en la celda del período original
    await expect(celdaOrigen.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).not.toBeVisible();

    // expect: la apertura aparece ahora en la celda del período nuevo
    await expect(celdaDestino.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();
  });
});
