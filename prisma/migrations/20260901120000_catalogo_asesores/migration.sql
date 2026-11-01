-- Catálogo de asesores pedagógicos: el campo "asesor" de Asignatura pasa de
-- texto libre a apuntar a una fila de "Asesor", mismo mecanismo que el
-- catálogo de docentes. Se precarga con la lista real vigente y además se
-- migra cualquier nombre que ya estuviera escrito en el campo libre (por si
-- difiere de esa lista), sin perder nada.

-- CreateTable
CREATE TABLE "Asesor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveNormalizada" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Asesor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Asesor_nombre_key" ON "Asesor"("nombre");
CREATE UNIQUE INDEX "Asesor_claveNormalizada_key" ON "Asesor"("claveNormalizada");

-- Catálogo inicial: la lista vigente de asesores (prioridad 0 sobre lo que
-- ya hubiera cargado como texto libre, para quedarnos con esta ortografía).
INSERT INTO "Asesor" (nombre, "claveNormalizada")
SELECT DISTINCT ON (clave) nombre, clave FROM (
    SELECT nombre, lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')) AS clave, 0 AS prioridad
    FROM (VALUES
        ('Adriana Hermosilla'),
        ('Agostina Cortona'),
        ('Anahí Azcuy'),
        ('Cristina Teijeiro'),
        ('Evelin Pineda'),
        ('Florencia Palpacelli'),
        ('Gabriela Lladós'),
        ('Gonzalo Dalto'),
        ('Jimena Irusta'),
        ('Jorgelina Rodriguez Jauregui'),
        ('Julieta Santo'),
        ('Lucia Moro Eik'),
        ('Lucía Rodriguez'),
        ('Marcelo Hangshel Pentimalli'),
        ('Natalia Olmos'),
        ('Sebastian Rodriguez'),
        ('Victoria Coria'),
        ('Yamile Abed')
    ) AS lista(nombre)
    UNION ALL
    SELECT trim(asesor), lower(regexp_replace(trim(asesor), '\s+', ' ', 'g')), 1
    FROM "Asignatura" WHERE asesor IS NOT NULL AND trim(asesor) <> ''
) t
ORDER BY clave, prioridad, nombre;

-- AlterTable (nullable: se completa con el backfill de abajo)
ALTER TABLE "Asignatura" ADD COLUMN "asesorId" INTEGER;

UPDATE "Asignatura" a
SET "asesorId" = e.id
FROM "Asesor" e
WHERE a.asesor IS NOT NULL AND trim(a.asesor) <> ''
  AND e."claveNormalizada" = lower(regexp_replace(trim(a.asesor), '\s+', ' ', 'g'));

-- AlterTable (se borra el texto libre: nombre vive sólo en Asesor ahora)
ALTER TABLE "Asignatura" DROP COLUMN "asesor";

-- AddForeignKey
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Asesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
