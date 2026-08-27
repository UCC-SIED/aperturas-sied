// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test('Cambiar el rol del usuario de prueba', async ({ page }) => {
    // 1. Iniciar sesión, navegar a /admin y asegurar que exista el usuario zzz.test.director@ucc.edu.ar
    // (crearlo si no existe)
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/admin');

    const tablaUsuarios = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Carreras' }) });
    const filaUsuario = tablaUsuarios.getByRole('row').filter({ hasText: 'zzz.test.director@ucc.edu.ar' });

    const yaExiste = await filaUsuario.isVisible().catch(() => false);
    if (!yaExiste) {
      await page.getByRole('textbox', { name: 'Nombre' }).fill('ZZZ_TEST_Director');
      await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.director@ucc.edu.ar');
      await page.getByRole('combobox', { name: 'Rol', exact: true }).selectOption(['Consulta']);
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(filaUsuario).toBeVisible();
    }

    // 2. Localizar al usuario en el listado y abrir la edición de su rol
    const comboRol = filaUsuario.getByRole('combobox', { name: 'Rol de ZZZ_TEST_Director' });
    const botonCambiar = filaUsuario.getByRole('button', { name: 'Cambiar' });
    await expect(comboRol).toBeVisible();

    // 3. Cambiar el rol a 'Dirección de carrera' y guardar
    await comboRol.selectOption(['Dirección de carrera']);
    await botonCambiar.click();

    // Si el botón queda en estado pendiente mientras el server action corre, esperar a que
    // vuelva a su texto normal antes de recargar
    await expect(botonCambiar).toBeEnabled();
    await expect(botonCambiar).toHaveText('Cambiar');

    // expect: El listado de usuarios refleja el nuevo rol para zzz.test.director@ucc.edu.ar
    await expect(comboRol).toHaveValue('director');

    // Confirmar que el cambio persiste tras recargar
    await page.reload();
    await expect(comboRol).toHaveValue('director');
  });
});
