import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    // Base propia para tests: borran y recrean datos, no deben tocar dev.db
    globalSetup: './vitest.setup.ts',
    env: { DATABASE_URL: 'file:./test.db' },
    // Varios tests escriben en la misma base SQLite: en paralelo se pisan.
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
