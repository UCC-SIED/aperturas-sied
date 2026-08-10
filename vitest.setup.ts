// Los tests trabajan contra su propia base SQLite: borran y recrean tablas, y
// no deben tocar los datos de desarrollo (prisma/dev.db).
//
// Se arma con `db push` en vez de `migrate deploy` porque las migraciones
// versionadas están escritas para PostgreSQL (producción). El esquema es el
// mismo, así que la estructura resultante es idéntica.
import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'

export default function setup() {
  const archivo = path.resolve(__dirname, 'prisma/test.db')
  if (existsSync(archivo)) unlinkSync(archivo)

  // El esquema puede estar apuntando a PostgreSQL; los tests corren en SQLite
  execSync('node prisma/provider.mjs sqlite', { stdio: 'ignore' })
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  })
}
