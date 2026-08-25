-- AlterTable
-- Frena los intentos de adivinar una contraseña por fuerza bruta: sin esto,
-- nada impedía probar contraseñas seguidas contra un mismo correo.
ALTER TABLE "Usuario" ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "nivelBloqueo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "bloqueadoHasta" TIMESTAMP(3);
