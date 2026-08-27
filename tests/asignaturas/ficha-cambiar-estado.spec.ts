// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Asignaturas', () => {
  test('Entrar a la ficha de ZZZ_TEST_ASIGNATURA y cambiar su estado de producción', async ({ page }) => {
    // 1. Iniciar sesión, navegar a /asignaturas y hacer clic en ZZZ_TEST_ASIGNATURA
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/asignaturas');
    await page.getByRole('link', { name: 'ZZZ_TEST_ASIGNATURA' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/asignaturas/ZZZTEST001');

    // expect: La ficha muestra el estado de producción actual, docentes, planes en los que está incluida y aperturas asociadas
    await expect(page.getByRole('heading', { name: 'ZZZ_TEST_ASIGNATURA ZZZTEST001' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Producción' })).toBeVisible();
    const estadoBadge = page.locator('.estado-badge');
    const estadoSelect = page.getByRole('combobox', { name: 'Estado' });
    await expect(estadoBadge).toBeVisible();
    await expect(estadoSelect).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Agregar docente a ZZZ_TEST_ASIGNATURA' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Planes de estudio' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aperturas' })).toBeVisible();

    // 2. Registrar el estado de producción actual y cambiarlo a un valor distinto y válido usando el control correspondiente
    // (lógica determinística para que sea estable entre corridas: alterna entre 'Sin novedad' y 'Contratación')
    const estadoActual = (await estadoBadge.textContent())?.trim();
    const nuevoEstado = estadoActual === 'Sin novedad' ? 'Contratación' : 'Sin novedad';
    await estadoSelect.selectOption([nuevoEstado]);

    // 3. Guardar el cambio si el control lo requiere
    await page.getByRole('button', { name: 'Guardar' }).click();

    // expect: La ficha refleja inmediatamente el nuevo estado de producción
    await expect(estadoBadge).toHaveText(nuevoEstado);

    // expect: Al recargar la página, el nuevo estado persiste
    await page.reload();
    await expect(estadoBadge).toHaveText(nuevoEstado);
    await expect(estadoSelect).toHaveValue(nuevoEstado === 'Contratación' ? 'contratacion' : 'sin_novedad');
  });
});
