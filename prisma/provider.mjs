// Ajusta el motor del schema según a dónde apunte DATABASE_URL.
//
// Producción usa PostgreSQL (Supabase); en desarrollo y en los tests alcanza
// con un archivo SQLite. El esquema es uno solo: esto sólo reescribe la línea
// del provider antes de que Prisma lo lea.
//
// Uso: node prisma/provider.mjs [postgresql|sqlite]
//      sin argumento, lo deduce de DATABASE_URL.
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const archivo = path.join(aqui, 'schema.prisma')

const url = process.env.DATABASE_URL ?? ''
const pedido = process.argv[2]
const motor = pedido ?? (url.startsWith('file:') || !url ? 'sqlite' : 'postgresql')

if (!['sqlite', 'postgresql'].includes(motor)) {
  console.error(`Motor desconocido: ${motor}. Usá sqlite o postgresql.`)
  process.exit(1)
}

const original = readFileSync(archivo, 'utf8')
const actual = original.match(/provider\s*=\s*"(\w+)"/)?.[1]

if (actual === motor) {
  console.log(`schema.prisma ya está en ${motor}`)
  process.exit(0)
}

// PostgreSQL necesita directUrl para las migraciones (el pooling no las soporta)
const nuevo = original
  .replace(/(datasource db \{[^}]*?provider\s*=\s*)"\w+"/s, `$1"${motor}"`)
  .replace(/\n\s*directUrl\s*=\s*env\("DIRECT_URL"\)/g, '')
  .replace(
    /(datasource db \{[^}]*?url\s*=\s*env\("DATABASE_URL"\))/s,
    motor === 'postgresql' ? '$1\n  directUrl = env("DIRECT_URL")' : '$1',
  )

writeFileSync(archivo, nuevo)
console.log(`schema.prisma: ${actual} -> ${motor}`)
