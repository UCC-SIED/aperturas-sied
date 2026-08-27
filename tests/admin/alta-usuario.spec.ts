// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test('Dar de alta un usuario de prueba', async ({ page }) => {
    // 1. Iniciar sesión con la cuenta de prueba y navegar a /admin
    await page.goto('https://aperturas-sied.vercel.app/ingresar');
    await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.e2e@ucc.edu.ar');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('ZzzTest2026!Playwright');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('https://aperturas-sied.vercel.app/panel');

    await page.goto('https://aperturas-sied.vercel.app/admin');

    // expect: se muestra la gestión de usuarios, roles, carreras y pedidos de contraseña pendientes
    await expect(page.getByRole('heading', { name: /Pedidos de contraseña/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dar de alta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Usuarios/ })).toBeVisible();

    const tablaUsuarios = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Carreras' }) });
    const filaUsuario = tablaUsuarios.getByRole('row').filter({ hasText: 'zzz.test.director@ucc.edu.ar' });

    // 2. Usar la acción de nuevo usuario/agregar usuario — evitar duplicados: sólo dar de alta si
    // todavía no está listado de una corrida anterior. El formulario de alta ya está visible en la
    // página (no requiere un botón aparte para abrirse).
    const yaExiste = await filaUsuario.isVisible().catch(() => false);
    // expect: se abre un formulario de alta
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Correo institucional' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Rol', exact: true })).toBeVisible();

    if (!yaExiste) {
      // 3. Completar el correo con zzz.test.director@ucc.edu.ar, nombre y un rol inicial, y guardar
      await page.getByRole('textbox', { name: 'Nombre' }).fill('ZZZ_TEST_Director');
      await page.getByRole('textbox', { name: 'Correo institucional' }).fill('zzz.test.director@ucc.edu.ar');
      await page.getByRole('combobox', { name: 'Rol', exact: true }).selectOption(['Consulta']);
      await page.getByRole('button', { name: 'Dar de alta' }).click();
    }

    // expect: el nuevo usuario aparece en el listado de usuarios con el correo y rol indicados
    // (ya sea recién creado o preexistente)
    await expect(filaUsuario).toBeVisible();
    await expect(filaUsuario).toContainText('ZZZ_TEST_Director');
    await expect(filaUsuario).toContainText('zzz.test.director@ucc.edu.ar');
  });
});
