// Crea los usuarios iniciales y les asigna carreras.
// Uso: npx tsx migracion/usuarios.ts
import { prisma } from '../src/lib/db'

// Editar según el equipo real. Los directores se asocian a sus carreras por
// nombre: si la carrera no existe todavía en la base, se avisa y se saltea.
const USUARIOS: { email: string; nombre: string; rol: string; carreras?: string[] }[] = [
  { email: 'tecnologia.sied@ucc.edu.ar', nombre: 'Tecnología Educativa SIED', rol: 'sied' },
  { email: 'direccion.sied@ucc.edu.ar', nombre: 'Dirección SIED', rol: 'consulta' },

  // Posgrado
  { email: 'direccion.empresas@ucc.edu.ar', nombre: 'Dirección de Empresas', rol: 'director', carreras: ['Dirección de Empresas'] },
  { email: 'direccion.nt@ucc.edu.ar', nombre: 'Dirección Nuevas Tecnologías', rol: 'director', carreras: ['NT - Alta Gerencia', 'NT - Ciberseguridad', 'NT - Finanzas y Seguros'] },
  { email: 'direccion.cooperacion@ucc.edu.ar', nombre: 'Dirección Cooperación Internacional', rol: 'director', carreras: ['Cooperación Internacional'] },
  { email: 'direccion.proyectos@ucc.edu.ar', nombre: 'Dirección Estratégica de Proyectos', rol: 'director', carreras: ['Dirección Estratégica de Proyectos'] },
  { email: 'direccion.liderazgo@ucc.edu.ar', nombre: 'Dirección y Liderazgo de Personas', rol: 'director', carreras: ['Dirección y Liderazgo de Personas'] },
  { email: 'direccion.innovacion@ucc.edu.ar', nombre: 'Dirección Innovación de Negocios', rol: 'director', carreras: ['Innovación de Negocios'] },
  { email: 'direccion.operaciones@ucc.edu.ar', nombre: 'Dirección Operaciones y Cadena de Valor', rol: 'director', carreras: ['Operaciones y Cadena de Valor'] },

  // Educación
  { email: 'direccion.inicial@ucc.edu.ar', nombre: 'Dirección Educación Inicial', rol: 'director', carreras: ['Educación Inicial'] },
  { email: 'direccion.cseducacion@ucc.edu.ar', nombre: 'Dirección Ciencias de la Educación', rol: 'director', carreras: ['Ciencias de la Educación'] },
  { email: 'direccion.gestioneducativa@ucc.edu.ar', nombre: 'Dirección Gestión Educativa', rol: 'director', carreras: ['Gestión Educativa'] },
  { email: 'direccion.especial@ucc.edu.ar', nombre: 'Dirección Gestión de la Educación Especial', rol: 'director', carreras: ['Gestión de la Educación Especial'] },
  { email: 'direccion.profesorado@ucc.edu.ar', nombre: 'Dirección Profesorado Universitario', rol: 'director', carreras: ['Profesorado Universitario'] },
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
