-- AlterTable
-- Las asignaturas que ya existen quedan con principalCodigo null (son lugares
-- del plan, no variantes) y variantesRequeridas en 1, que es el caso más común
-- y sólo significa algo si alguna vez se les cuelga una variante.
ALTER TABLE "Asignatura" ADD COLUMN "principalCodigo" TEXT;
ALTER TABLE "Asignatura" ADD COLUMN "variantesRequeridas" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Asignatura_principalCodigo_idx" ON "Asignatura"("principalCodigo");

-- AddForeignKey
-- SetNull y no Cascade: borrar el seminario del plan no puede llevarse puesta
-- la producción ya cargada de sus variantes.
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_principalCodigo_fkey" FOREIGN KEY ("principalCodigo") REFERENCES "Asignatura"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;
