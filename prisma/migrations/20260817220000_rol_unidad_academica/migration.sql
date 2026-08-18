-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "unidadId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
