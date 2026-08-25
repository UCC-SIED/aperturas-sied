-- AlterTable
-- Unidad Académica (o Administración) deja constancia de que revisó el docente
-- tutor de una apertura y el grupo de contenidistas de una asignatura.
ALTER TABLE "Apertura" ADD COLUMN "docenteTutorValidado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Asignatura" ADD COLUMN "contenidistasValidados" BOOLEAN NOT NULL DEFAULT false;
