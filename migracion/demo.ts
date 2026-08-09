// Datos de demostración para desarrollo: pobla la base local pasando por el
// mismo cargador que la migración real. Uso: npx tsx migracion/demo.ts
import { prisma } from '../src/lib/db'
import { cargar } from './cargar'
import type { FilaAsignatura } from './parsers/tipos'

const f = (x: Partial<FilaAsignatura> & Pick<FilaAsignatura, 'carrera' | 'codigo' | 'nombre'>): FilaAsignatura => ({
  unidad: 'posgrado', cohorte: 'COHORTE  2025', catedra: 'DA', cargaHoraria: 21, orden: null,
  duracion: null, estadoOrigen: '5.FINALIZADA', periodoNombre: 'Mensual_Septiembre_2026',
  fechas: {
    inicioCursado: new Date(2026, 8, 9), aperturaInscripcion: new Date(2026, 7, 30),
    cierreInscripcion: new Date(2026, 8, 6), finCursado: new Date(2026, 9, 9),
    aperturaAfi: new Date(2026, 9, 10), cierreAfi: new Date(2026, 9, 31),
    cierreAsignatura: new Date(2026, 10, 9), actas: null,
  },
  ...x,
})

async function main() {
  const r = await cargar([
    f({ carrera: 'DIRECCION DE EMPRESAS', codigo: 'EP01155', nombre: 'SISTEMAS DE INFORMACIÓN PARA LA CREACIÓN DE VALOR', orden: 5 }),
    f({ carrera: 'DIRECCION DE EMPRESAS', codigo: 'EP00728', nombre: 'HABILIDADES Y COMPETENCIAS DIRECTIVAS', orden: 20, estadoOrigen: '2.CONSTRUCCIÓN DE CONTENIDOS' }),
    f({ carrera: 'DIRECCION DE EMPRESAS', codigo: 'EP01864', nombre: 'SEMINARIO I', orden: 18, estadoOrigen: '3.MAQUETACIÓN' }),
    // transversal en dos carreras
    f({ carrera: 'DIRECCION DE EMPRESAS', codigo: 'EP00461', nombre: 'TALLERES DE APOYO PARA LA REALIZACIÓN DEL TRABAJO FINAL', orden: 4, estadoOrigen: '3.MAQUETACIÓN' }),
    f({ carrera: 'NT - ALTA GERENCIA', codigo: 'EP00461', nombre: 'TALLERES DE APOYO PARA LA REALIZACIÓN DEL TRABAJO FINAL', orden: 9, estadoOrigen: '3.MAQUETACIÓN' }),
    f({ carrera: 'NT - ALTA GERENCIA', codigo: 'EP01158', nombre: 'SEMINARIO III', orden: 13, estadoOrigen: '2.CONSTRUCCIÓN DE CONTENIDOS',
        periodoNombre: 'Mensual_Octubre_2026',
        fechas: { ...f({ carrera: '', codigo: '', nombre: '' }).fechas, inicioCursado: new Date(2026, 9, 7), aperturaInscripcion: new Date(2026, 8, 27) } }),
    // educación sin período (se infiere/genera)
    f({ unidad: 'educacion', carrera: 'Educación Inicial', codigo: '1210132', nombre: 'CORRIENTES PEDAGÓGICAS CONTEMPORÁNEAS',
        cohorte: 'COHORTE  4', duracion: 'Bimestral', periodoNombre: null,
        fechas: { ...f({ carrera: '', codigo: '', nombre: '' }).fechas, inicioCursado: new Date(2026, 7, 5), aperturaInscripcion: new Date(2026, 6, 27) } }),
  ], [
    { codigo: 'EP01864', carrera: 'Dirección de Empresas', docente: 'Barrientos', asesor: 'Victoria Coria', estado: 'maquetacion' },
    { codigo: 'EP00461', carrera: 'Dirección de Empresas', docente: 'Giovanardi Mariana Alejandra', asesor: 'Anahí Azcuy', estado: 'maquetacion' },
  ], prisma)
  console.log('Demo cargada:', r)
  await prisma.$disconnect()
}

main()
