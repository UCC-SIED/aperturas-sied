import { defineConfig } from '@playwright/test';

/**
 * El Chromium que descarga Playwright no arranca en esta máquina (falla de
 * resolución de manifiesto SxS de Windows, ajeno al proyecto). Usamos el
 * Chrome del sistema en su lugar — ya está instalado y anda bien. El
 * servidor MCP de test (agentes generator/planner) necesita un proyecto con
 * nombre para poder seleccionarlo explícitamente.
 */
export default defineConfig({
  testDir: './tests',
  // La carpeta tests/ también tiene los unit tests de Vitest (*.test.ts,
  // sueltos en la raíz de tests/). Los nuestros son *.spec.ts en subcarpetas.
  testMatch: '**/*.spec.ts',
  // Los tests pegan contra la base de producción real, compartida entre
  // todos — no son islas aisladas. Correrlos en paralelo hace que dos tests
  // agreguen/quiten la misma apertura de prueba al mismo tiempo y se pisen.
  workers: 1,
  use: {
    baseURL: 'https://aperturas-sied.vercel.app',
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' },
    },
  ],
});
