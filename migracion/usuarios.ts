// Crea los usuarios iniciales y les asigna carreras.
// Uso: npx tsx migracion/usuarios.ts
import { prisma } from '../src/lib/db'

// Editar según el equipo real. Los directores se asocian a sus carreras por
// nombre: si la carrera no existe todavía en la base, se avisa y se saltea.
const USUARIOS: { email: string; nombre: string; rol: string; carreras?: string[] }[] = [
  { email: 'tecnologia.sied@ucc.edu.ar', nombre: 'Tecnología Educativa SIED', rol: 'sied' },
  { email: 'direccion.sied@ucc.edu.ar', nombre: 'Dirección SIED', rol: 'consulta' },
  { email: 'direccion.empresas@ucc.edu.ar', nombre: 'Dirección de Empresas', rol: 'director', carreras: ['DIRECCION DE EMPRESAS'] },
  { email: 'direccion.nt@ucc.edu.ar', nombre: 'Dirección Nuevas Tecnologías', rol: 'director', carreras: ['NT - ALTA GERENCIA', 'NT - CYBERSEGURIDAD'] },
  { email: 'direccion.cooperacion@ucc.edu.ar', nombre: 'Dirección Cooperación Internacional', rol: 'director', carreras: ['COOPERACION INTERNACIONAL'] },
  { email: 'direccion.proyectos@ucc.edu.ar', nombre: 'Dirección Estratégica de Proyectos', rol: 'director', carreras: ['DIR. ESTRAT. PROYECTOS'] },
  { email: 'direccion.educacion@ucc.edu.ar', nombre: 'Dirección Educación', rol: 'director', carreras: ['Educación Inicial', 'Ciencias de la Educación'] },
]

async function main() {
  for (const u of USUARIOS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, rol: u.rol, activo: true },
      create: { email: u.email, nombre: u.nombre, rol: u.rol },
    })
    for (const nombreCarrera of u.carreras ?? []) {
      const c = await prisma.carrera.findFirst({ where: { nombre: nombreCarrera } })
      if (!c) {
        console.warn(`  · "${nombreCarrera}" no existe todavía — se saltea (correr después de la migración)`)
        continue
      }
      await prisma.usuarioCarrera.upsert({
        where: { usuarioId_carreraId: { usuarioId: usuario.id, carreraId: c.id } },
        update: {},
        create: { usuarioId: usuario.id, carreraId: c.id },
      })
    }
    console.log(`${u.rol.padEnd(9)} ${u.nombre}`)
  }
  console.log(`\n${USUARIOS.length} usuarios listos.`)
  await prisma.$disconnect()
}

main()
