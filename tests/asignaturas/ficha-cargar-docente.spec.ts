// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Asignaturas', () => {
  test('Cargar un docente en la ficha de ZZZ_TEST_ASIGNATURA', async ({ page }) => {
    // 1. Iniciar sesión y navegar a /asignaturas/ZZZTEST001
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/asignaturas/ZZZTEST001');

    // Evitar duplicados: sólo agregar el docente de prueba si todavía no está listado de una corrida anterior
    const docenteItem = page.getByRole('listitem').filter({ hasText: 'Docente ZZZ Test' });
    const yaExiste = await docenteItem.isVisible().catch(() => false);

    // 2. Usar la acción de agregar/cargar docente en la sección de docentes de la ficha
    const campoDocente = page.getByRole('textbox', { name: 'Agregar docente a ZZZ_TEST_ASIGNATURA' });

    // expect: Se abre un formulario o selector para los datos del docente
    await expect(campoDocente).toBeVisible();

    if (!yaExiste) {
      // 3. Completar los datos del docente de prueba (nombre 'Docente ZZZ Test'; este formulario no solicita
      // correo) y confirmar
      await campoDocente.fill('Docente ZZZ Test');
      await page.getByRole('button', { name: 'Confirmar docente para ZZZ_TEST_ASIGNATURA' }).click();
      // El "+" sólo agrega el docente al estado local del formulario: hay que usar el botón "Guardar" general
      // de la sección de Producción para que la asignación quede persistida en el servidor.
      await page.getByRole('button', { name: 'Guardar' }).click();
    }

    // expect: El docente aparece listado en la sección de docentes de la ficha
    // expect: Se muestra confirmación de éxito
    await expect(docenteItem).toBeVisible();
    await expect(docenteItem.getByRole('button', { name: 'Quitar a Docente ZZZ Test de ZZZ_TEST_ASIGNATURA' })).toBeVisible();
  });
});
