-- AlterTable
-- La fecha de actas no se usa en ningún lado: no se carga, no se muestra y no
-- entra en ninguna regla del calendario. Se va del período y de la apertura.
ALTER TABLE "Periodo" DROP COLUMN "actas";
ALTER TABLE "Apertura" DROP COLUMN "actas";
