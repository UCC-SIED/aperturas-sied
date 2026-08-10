// Crea los usuarios iniciales y les asigna carreras.
// Uso: npx tsx migracion/usuarios.ts
import { prisma } from '../src/lib/db'

// Editar según el equipo real. Los directores se asocian a sus carreras por
// nombre: si la carrera no existe todavía en la base, se avisa y se saltea.
type Usuario = {
  email: string
  nombre: string
  rol: string
  carreras?: string[]
  /** Los inactivos quedan cargados pero no pueden entrar (falta el correo real). */
  activo?: boolean
}

const USUARIOS: Usuario[] = [
  // Administración: además de trabajar como el equipo SIED, gestiona usuarios y permisos
  { email: 'tecnologia.sied@ucc.edu.ar', nombre: 'Tecnología Educativa SIED', rol: 'admin' },
  // Lleva el seguimiento de contratación y producción: necesita cargar estados,
  // no sólo mirarlos.
  { email: 'direccion.sied@ucc.edu.ar', nombre: 'Dirección SIED', rol: 'sied' },

  // Posgrado — correos institucionales confirmados
  { email: 'distancia.mba.ep@ucc.edu.ar', nombre: 'Dirección de Empresas', rol: 'director', carreras: ['Dirección de Empresas'] },
  { email: 'distancia.mgnt.ep@ucc.edu.ar', nombre: 'Dirección Nuevas Tecnologías', rol: 'director', carreras: ['NT - Alta Gerencia', 'NT - Ciberseguridad', 'NT - Finanzas y Seguros'] },
  { email: 'eci.ep@ucc.edu.ar', nombre: 'Dirección Cooperación Internacional', rol: 'director', carreras: ['Cooperación Internacional'] },
  { email: 'distancia.mdep.ep@ucc.edu.ar', nombre: 'Dirección Estratégica de Proyectos', rol: 'director', carreras: ['Dirección Estratégica de Proyectos'] },
  { email: 'distancia.mdlpo.ep@ucc.edu.ar', nombre: 'Dirección y Liderazgo de Personas', rol: 'director', carreras: ['Dirección y Liderazgo de Personas'] },
  { email: 'distancia.min.ep@ucc.edu.ar', nombre: 'Dirección Innovación de Negocios', rol: 'director', carreras: ['Innovación de Negocios'] },
  // Todavía sin correo institucional: queda inactivo hasta que se lo asignen.
  { email: 'PENDIENTE.operaciones@ucc.edu.ar', nombre: 'Dirección Operaciones y Cadena de Valor', rol: 'director', carreras: ['Operaciones y Cadena de Valor'], activo: false },

  // Educación — correos provisorios, falta confirmarlos con la Facultad
  { email: 'direccion.inicial@ucc.edu.ar', nombre: 'Dirección Educación Inicial', rol: 'director', carreras: ['Educación Inicial'] },
  { email: 'direccion.cseducacion@ucc.edu.ar', nombre: 'Dirección Ciencias de la Educación', rol: 'director', carreras: ['Ciencias de la Educación'] },
  { email: 'direccion.gestioneducativa@ucc.edu.ar', nombre: 'Dirección Gestión Educativa', rol: 'director', carreras: ['Gestión Educativa'] },
  { email: 'direccion.especial@ucc.edu.ar', nombre: 'Dirección Gestión de la Educación Especial', rol: 'director', carreras: ['Gestión de la Educación Especial'] },
  { email: 'direccion.profesorado@ucc.edu.ar', nombre: 'Dirección Profesorado Universitario', rol: 'director', carreras: ['Profesorado Universitario'] },
]

async function main() {
  for (const u of USUARIOS) {
    const activo = u.activo !== false
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, rol: u.rol, activo },
      create: { email: u.email, nombre: u.nombre, rol: u.rol, activo },
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
    // Las carreras que ya no le corresponden se le quitan
    const idsCarreras = (await Promise.all(
      (u.carreras ?? []).map((n) => prisma.carrera.findFirst({ where: { nombre: n } })),
    )).filter(Boolean).map((c) => c!.id)
    await prisma.usuarioCarrera.deleteMany({
      where: { usuarioId: usuario.id, carreraId: { notIn: idsCarreras } },
    })

    console.log(`${u.rol.padEnd(9)} ${u.nombre}${activo ? '' : '  [inactivo: falta el correo]'}`)
  }

  // Quien ya no figura en la lista queda desactivado, no borrado: su nombre
  // tiene que seguir apareciendo en el historial de cambios.
  const desactivados = await prisma.usuario.updateMany({
    where: { email: { notIn: USUARIOS.map((u) => u.email) }, activo: true },
    data: { activo: false },
  })
  if (desactivados.count) {
    console.log(`\n${desactivados.count} usuario(s) que ya no están en la lista quedaron desactivados.`)
  }

  const activos = USUARIOS.filter((u) => u.activo !== false).length
  console.log(`\n${activos} usuarios activos de ${USUARIOS.length}.`)
  await prisma.$disconnect()
}

main()
