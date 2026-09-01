/**
 * Carga en bloque el catálogo de docentes desde la lista de usuarios con rol
 * docente en Canvas (Posgrado + Educación). Es aditivo: cada nombre que ya
 * existe en el catálogo (por nombre normalizado) se reusa, no se duplica.
 *
 * Fuente: planilla "Docentes_Posgrado_Educacion" (exportada de Canvas),
 * hojas "Posgrado" y "Educacion". No trae la clave UCC ni asigna a nadie a
 * ninguna asignatura o apertura — sólo puebla el catálogo de personas.
 *
 * Uso: npx tsx migracion/docentes.ts
 */
import { prisma } from '../src/lib/db'
import { resolverDocentes } from '../src/lib/docentes'

const POSGRADO = [
  'ACEVEDO, MARIELA HEMILSE', 'ACOSTA, MARIANO OSCAR', 'AIRE, CARLOS ESTEBAN',
  'ALVAREZ-GATTI, MARYBEL', 'Ana Fité', 'ANCIOLA, INES',
  'ARAYA SASSI, CLAUDIO CHRISTIAN', 'ARONICA, SANDRA FABIANA',
  'ASTORI, GERMAN EDUARDO', 'BALMACEDA, CRISTIAN OSVALDO',
  'BARRIENTOS GONCALVES, JORGE WASHINGTON', 'BAUDUCCO, JUAN JOSÉ',
  'BORDABOSSANA, DANIEL ANDRES', 'CALVO, JUAN MANUEL', 'CALZADA, MAIRA GABRIELA',
  'CASANOVAS, JOSE IGNACIO', 'Cecilia Pacce Rosato', 'CEREZOLI, MICAELA NANCY',
  'CINGOLANI, MÓNICA SUSANA', 'CIUTI, ANA VALERIA', 'COCORDA, ESTEBAN JOSÉ',
  'COLASANTI, ELENA LUCIA', 'CRISAFULLI, JORGE LUCIANO', 'Desirée D´Amico',
  'ELETTORE, LUCAS MATÍAS', 'ESCAÑUELA, VIRGINIA ANAHÍ', 'ESCOBAR, MILTON ERNESTO',
  'FELDMAN, GABRIEL RUBEN', 'FERRERO, MARÍA MERCEDES', 'FONTANA, SILVIA ESTHER',
  'FRIAS, HUGO FERNANDO', 'GAIDO, AGUSTÍN', 'GARZÓN, SOFÍA MARÍA',
  'GIACCHINO, VALERIA SUSANA', 'GIOVANARDI, MARIANA ALEJANDRA', 'GONZÁLEZ, SIMÓN',
  'GRANJA, MARÍA CAROLINA', 'HANGSHEL PENTIMALLI, MARCELO HERMAN',
  'HEREDIA  QUERRO, JUAN SEBASTIÁN', 'HERMOSO, FABIANA GRISEL',
  'HERNÁNDEZ, JULIANA', 'IBAÑA, GRISELDA BEATRIZ', 'Laura Conti',
  'LE MOAL, HÉLOÏSE MARIE JEANNE', 'LUNA, MARCOS JESUS', 'MARTIN, SANTIAGO',
  'MARTINS, NICOLAS HORACIO', 'MARTÍNEZ, CLAUDIA ALEJANDRA', 'MEDEL, RICARDO HUGO',
  'MOSQUERA SADLEIR, CARLOS MARIANO', 'MOZAS, GONZALO ANDRES', 'NIEVA, ANA SOFÍA',
  'NIEVAS, ANALÍA RAQUEL', 'NOVAIRA, NICOLÁS', 'OLIVERO, JUAN CARLOS',
  'PANERO, ELISA MERCEDES', 'PAVON, DANIEL JOSE', 'PEREZ, LETICIA',
  'PEROSSA, MARIO LUIS', 'PETELIN, MARIANA JUDIT', 'PINEDA, ANDREA EVELÍN',
  'PUENTE ROSA, DIEGO SEBASTIAN', 'PULCINI, VALENTINA', 'PUSIOL, DANTE ANDRÉS',
  'Rodolfo Bongiovanni', 'ROJAS, MIRIAM VIVIANA', 'RUFAIL, SARA SILVANA',
  'SANCHEZ, GABRIEL LEANDRO', 'SANCHEZ, NATALIA ALEJANDRA', 'SCARAMUZZA, MARIA LAURA',
  'Sonia Villalba', 'TEIJEIRO, CRISTINA ALEJANDRA', 'URDIALES, MARIA VICTORIA',
  'VAL, MARÍA EMILIA', 'VIRGOLINI, PABLO ALEJANDRO', 'Viviana Arias',
]

const EDUCACION = [
  'ACOSTA, MARIANO OSCAR', 'Adriana Carlota Di Francesco', 'AGUIRRE, MARIA ANA',
  'BARILLA, MARCELO FRANCISCO', 'BAUDUCCO, JUAN JOSÉ', 'BOLOGNA, EDUARDO LEON',
  'Bono Laura', 'BRITOS, GERARDO ALBERTO', 'Brusa Martín', 'CABRERA, GABRIELA PILAR',
  'Caturelli Sofía', 'Cecilia Pacce Rosato', 'CENTENO, MARIA VICTORIA',
  'CHAILE, MARIANA LORENA', 'CHALUB, DELIA MARIA', 'CRINEJO, EVA LAUREANA',
  'DANDREA, JAQUELINA ELIZABETH', 'DELLA VEDOBA, CECILIA ELIZABETH',
  'Emma Carolina Arduh', 'FARIÑA, ANDREA ALEJANDRA', 'FAUSTINELLI, MELINA',
  'Federico Ridissi', 'FERRAL, MARIA PAULA', 'FROLA, ESTER RAMONA',
  'Gabriela López', 'GAIDO, AGUSTÍN', 'GONZALEZ, NATALIA PAOLA',
  'GRANDI, MARCELA ELIZABETH', 'JARCHUM, PATRICIA', 'LEDESMA, LEANDRO DAVID',
  'Leonardo Colazo', 'LIENDO, MARÍA VICTORIA', 'MARCHISIO, VERONICA BEATRIZ',
  'MARCONI, NADIA VERONICA', 'MEDINA, KARINA ELIZABETH', 'Miguel Vargas Muñoz',
  'OLIVO, HUGO OSCAR', 'PARMA, ANA CAROLINA', 'PELLEGRINO, NORA RAQUEL',
  'PINEDA, ANDREA EVELÍN', 'Prof. Alicia Domimguez', 'Prof. Tartabini Ana',
  'PÉREZ, MARÍA SOLEDAD', 'QUINTANA, MARÍA SILVINA', 'RAMOS, ROXANA NOELIA',
  'ROBLEDO, ANGEL MARCELO', 'ROMERO ROZAS, CAROLINA ELEONOR',
  'SAGRISTANI, MARIA DE LOS ANGELES', 'Sandra Gómez', 'SORIA, LAUTARO',
  'TEIJEIRO, CRISTINA ALEJANDRA', 'VERGARA BIANCIOTTI, LILIANA VANESA',
  'VIZCARRA, CLAUDIA ALEJANDRA', 'ZABALZA, PATRICIA LAURA', 'ZARAZAGA, TOMÁS ALBERTO',
]

async function main() {
  const antes = await prisma.docente.count()
  const nombres = [...new Set([...POSGRADO, ...EDUCACION])]
  await resolverDocentes(prisma, nombres)
  const despues = await prisma.docente.count()

  console.log(`Nombres de la planilla (sin repetir entre las dos hojas): ${nombres.length}`)
  console.log(`Catálogo antes: ${antes} · después: ${despues} · nuevos: ${despues - antes}`)
  await prisma.$disconnect()
}

main()
