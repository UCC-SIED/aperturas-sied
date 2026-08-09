import { describe, it, expect } from 'vitest'
import { parseTablero } from '../migracion/parsers/tablero'

const respaldo = JSON.stringify({
  'Cooperación Internacional': [
    { codigo: 'EP01819', asignatura: 'GESTIÓN DE RIESGO...', catedra: 'DA', cohorte: 'COHORTE  2025', docente: 'Silvia Fontana/ Virginia Escañuela', asesor: 'Marcelo Hangshel Pentimalli', estado: 'maquetacion', estado_origen: '3.MAQUETACIÓN', numero: 5 },
    { codigo: 'PLAN-12', asignatura: 'TRABAJO FINAL INTEGRADOR', catedra: '', cohorte: '', docente: '', asesor: '', estado: 'sin_novedad', estado_origen: '', numero: 12 },
  ],
})

describe('parseTablero', () => {
  it('extrae docente, asesor y estado por código', () => {
    const filas = parseTablero(respaldo)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({
      codigo: 'EP01819',
      carrera: 'Cooperación Internacional',
      docente: 'Silvia Fontana/ Virginia Escañuela',
      asesor: 'Marcelo Hangshel Pentimalli',
      estado: 'maquetacion',
    })
  })
})
