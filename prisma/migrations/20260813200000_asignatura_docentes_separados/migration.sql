-- CreateTable
CREATE TABLE "AsignaturaDocente" (
    "id" SERIAL NOT NULL,
    "asignaturaCodigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AsignaturaDocente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsignaturaDocente_asignaturaCodigo_nombre_key" ON "AsignaturaDocente"("asignaturaCodigo", "nombre");

-- AddForeignKey
ALTER TABLE "AsignaturaDocente" ADD CONSTRAINT "AsignaturaDocente_asignaturaCodigo_fkey" FOREIGN KEY ("asignaturaCodigo") REFERENCES "Asignatura"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: separar Asignatura.docente ("A / B", "A, B" o un solo nombre) en
-- un registro por docente, antes de borrar la columna vieja.
INSERT INTO "AsignaturaDocente" ("asignaturaCodigo", "nombre", "orden")
SELECT a."codigo", TRIM(BOTH FROM d.nombre), (d.ord - 1)
FROM "Asignatura" a,
     LATERAL (
       SELECT nombre, ROW_NUMBER() OVER () AS ord
       FROM UNNEST(regexp_split_to_array(a."docente", '[/,]')) AS nombre
     ) AS d
WHERE a."docente" IS NOT NULL AND TRIM(BOTH FROM d.nombre) <> ''
ON CONFLICT ("asignaturaCodigo", "nombre") DO NOTHING;

-- AlterTable
ALTER TABLE "Asignatura" DROP COLUMN "docente";
