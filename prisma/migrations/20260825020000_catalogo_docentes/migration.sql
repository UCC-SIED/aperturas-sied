-- Catálogo único de docentes: AperturaDocente y AsignaturaDocente pasan de
-- guardar el nombre suelto a apuntar a una fila de "Docente". Esta migración,
-- a diferencia de las anteriores, no es sólo un cambio de esquema: incluye el
-- traspaso de los datos ya cargados (cada nombre distinto se convierte en una
-- persona del catálogo tal como está escrito hoy — no se pierde nada).

-- CreateTable
CREATE TABLE "Docente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveNormalizada" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Docente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Docente_nombre_key" ON "Docente"("nombre");
CREATE UNIQUE INDEX "Docente_claveNormalizada_key" ON "Docente"("claveNormalizada");

-- AlterTable (nullable por ahora: se completa con el backfill de abajo)
ALTER TABLE "AperturaDocente" ADD COLUMN "docenteId" INTEGER;
ALTER TABLE "AsignaturaDocente" ADD COLUMN "docenteId" INTEGER;

-- Backfill: un Docente por cada nombre distinto ya cargado en cualquiera de
-- las dos tablas. La clave normalizada (minúsculas, sin espacios de sobra)
-- decide qué cuenta como "el mismo nombre" — igual que src/lib/docentes.ts.
INSERT INTO "Docente" (nombre, "claveNormalizada")
SELECT DISTINCT ON (clave) nombre, clave FROM (
    SELECT nombre, lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')) AS clave FROM "AperturaDocente"
    UNION ALL
    SELECT nombre, lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')) AS clave FROM "AsignaturaDocente"
) t
ORDER BY clave, nombre;

UPDATE "AperturaDocente" ad
SET "docenteId" = d.id
FROM "Docente" d
WHERE d."claveNormalizada" = lower(regexp_replace(trim(ad.nombre), '\s+', ' ', 'g'));

UPDATE "AsignaturaDocente" ad
SET "docenteId" = d.id
FROM "Docente" d
WHERE d."claveNormalizada" = lower(regexp_replace(trim(ad.nombre), '\s+', ' ', 'g'));

-- Por si alguna apertura/asignatura ya tenía el mismo nombre cargado dos
-- veces con distinta ortografía (ahora resuelven al mismo docenteId): se
-- queda la fila más vieja, la de más se descarta, para no chocar con el
-- índice único nuevo.
DELETE FROM "AperturaDocente" a USING "AperturaDocente" b
WHERE a.id > b.id AND a."aperturaId" = b."aperturaId" AND a."docenteId" = b."docenteId";

DELETE FROM "AsignaturaDocente" a USING "AsignaturaDocente" b
WHERE a.id > b.id AND a."asignaturaCodigo" = b."asignaturaCodigo" AND a."docenteId" = b."docenteId";

-- Ya no puede haber ninguna fila sin docenteId asignado
ALTER TABLE "AperturaDocente" ALTER COLUMN "docenteId" SET NOT NULL;
ALTER TABLE "AsignaturaDocente" ALTER COLUMN "docenteId" SET NOT NULL;

-- DropIndex (el viejo índice único por nombre ya no aplica)
DROP INDEX "AperturaDocente_aperturaId_nombre_key";
DROP INDEX "AsignaturaDocente_asignaturaCodigo_nombre_key";

-- AlterTable (se borra el texto libre: nombre vive sólo en Docente ahora)
ALTER TABLE "AperturaDocente" DROP COLUMN "nombre";
ALTER TABLE "AsignaturaDocente" DROP COLUMN "nombre";

-- CreateIndex
CREATE UNIQUE INDEX "AperturaDocente_aperturaId_docenteId_key" ON "AperturaDocente"("aperturaId", "docenteId");
CREATE UNIQUE INDEX "AsignaturaDocente_asignaturaCodigo_docenteId_key" ON "AsignaturaDocente"("asignaturaCodigo", "docenteId");

-- AddForeignKey
ALTER TABLE "AperturaDocente" ADD CONSTRAINT "AperturaDocente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AsignaturaDocente" ADD CONSTRAINT "AsignaturaDocente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
