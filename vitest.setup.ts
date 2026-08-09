// Los tests trabajan contra su propia base: borran y recrean tablas, y no deben
// tocar los datos de desarrollo (prisma/dev.db).
import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'

export default function setup() {
  const archivo = path.resolve(__dirname, 'prisma/test.db')
  if (existsSync(archivo)) unlinkSync(archivo)
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  })
}
