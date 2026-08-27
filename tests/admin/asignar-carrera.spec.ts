// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test('Asignar una carrera al usuario de prueba', async ({ page }) => {
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

    // 2. Abrir la edición de carreras asignadas para ese usuario y seleccionar ZZZ_TEST_CARRERA
    // La celda de "Carreras" es la 4ta columna (Nombre, Correo, Rol, Carreras, ...); su contenido
    // actúa como toggle para expandir el checklist de carreras, sin importar qué texto muestre.
    const celdaCarreras = filaUsuario.getByRole('cell').nth(3);
    await celdaCarreras.click();

    const checkboxCarrera = filaUsuario.getByRole('checkbox', { name: 'ZZZ_TEST_CARRERA Educación' });
    await expect(checkboxCarrera).toBeVisible();

    const yaMarcada = await checkboxCarrera.isChecked();
    if (!yaMarcada) {
      await checkboxCarrera.check();

      // 3. Guardar el cambio
      const botonGuardar = filaUsuario.getByRole('button', { name: 'Guardar carreras' });
      await botonGuardar.click();

      // Si el botón de guardado queda en estado pendiente mientras el server action corre,
      // esperar a que vuelva a su texto normal antes de seguir
      await expect(botonGuardar).toBeEnabled();
      await expect(botonGuardar).toHaveText('Guardar carreras');
    }

    // El checkbox de ZZZ_TEST_CARRERA queda marcado (ya sea porque ya lo estaba o porque se acaba
    // de guardar)
    await expect(checkboxCarrera).toBeChecked();

    // Colapsar el panel y confirmar que el listado de carreras asignadas muestra ZZZ_TEST_CARRERA
    await celdaCarreras.click();

    // expect: ZZZ_TEST_CARRERA queda listada entre las carreras asignadas al usuario zzz.test.director@ucc.edu.ar
    await expect(celdaCarreras).toContainText('ZZZ_TEST_CARRERA');

    // Confirmar que el cambio persiste tras recargar
    await page.reload();
    await expect(filaUsuario.getByRole('cell').nth(3)).toContainText('ZZZ_TEST_CARRERA');
  });
});
