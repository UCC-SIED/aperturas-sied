// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Períodos', () => {
  test('Editar la fecha de una apertura puntual (excepción sobre el período)', async ({ page }) => {
    // 1. Iniciar sesión, ir a /planificar?carrera=15 y asegurar que exista una apertura de ZZZ_TEST_ASIGNATURA
    // para ZZZ_TEST_COHORTE en el período Bimestral_Octubre_2026 (agregarla si no existe; si ya existe en
    // otro período, usar cualquiera que tenga)
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/planificar?carrera=15');

    const cohorteRow = page.getByRole('row', { name: /^ZZZ_TEST_COHORTE(?!_)/ });
    const yaTieneApertura = await cohorteRow
      .getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })
      .isVisible()
      .catch(() => false);
    if (!yaTieneApertura) {
      await page.getByLabel('Agregar asignatura a ZZZ_TEST_COHORTE en Bimestral_Octubre_2026').selectOption(['ZZZTEST001']);
      await page.getByRole('cell', { name: 'ZZZ_TEST_ASIGNATURA Agregar' }).getByRole('button').click();
    }
    // Esperar a que la apertura recién agregada quede reflejada en la grilla antes de
    // mirar en qué columna cayó (si no, la siguiente comprobación corre en carrera).
    await expect(cohorteRow.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })).toBeVisible();

    // La apertura puede haber quedado en la columna de Bimestral_Octubre_2026 o en la de ZZZ_TEST_PERIODO_2027
    const celdaColumna1 = cohorteRow.getByRole('cell').nth(0);
    const columna1TieneApertura = await celdaColumna1
      .getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' })
      .isVisible()
      .catch(() => false);
    const nombrePeriodo = columna1TieneApertura ? 'Bimestral_Octubre_2026' : 'ZZZ_TEST_PERIODO_2027';

    // 2. Ir a /periodos, entrar al detalle de ese mismo período y localizar la fila de ZZZ_TEST_ASIGNATURA
    await page.getByRole('link', { name: nombrePeriodo }).click();
    await page.waitForURL(/\/periodos\/\d+/);

    const asignaturaRow = page.getByRole('row', { name: /ZZZ_TEST_ASIGNATURA/ });
    await asignaturaRow.getByText('Editar').click();
    const inicioCursado = asignaturaRow.getByRole('textbox', { name: 'Inicio de cursado *' });

    // 3. Editar la fecha de esa apertura puntual (la fecha de inicio de cursado) a un valor distinto del
    // que tiene el período en general
    await inicioCursado.fill('2026-10-22');

    // 4. Guardar
    await asignaturaRow.getByRole('button', { name: 'Guardar fechas' }).click();
    // El botón queda deshabilitado y dice "Guardando" mientras la acción está en curso —
    // esperar a que vuelva a "Guardar fechas" antes de recargar, si no la recarga puede
    // ganarle a la escritura en el servidor.
    await expect(asignaturaRow.getByRole('button', { name: 'Guardar fechas' })).toBeVisible();

    // expect: la fecha personalizada queda guardada (recargar la página del detalle del período y confirmar
    // que persiste)
    await page.reload();
    await asignaturaRow.getByText('Editar').click();
    await expect(inicioCursado).toHaveValue('2026-10-22');
  });
});
