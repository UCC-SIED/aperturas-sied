-- AlterTable
-- El DEFAULT true deja marcados a los usuarios que ya existen: la contraseña
-- que usan hoy la definió administración, así que también la tienen que
-- reemplazar. No hace falta ningún backfill aparte.
ALTER TABLE "Usuario" ADD COLUMN "debeElegirContrasena" BOOLEAN NOT NULL DEFAULT true;
