-- CreateTable
CREATE TABLE "AvisoDescartado" (
    "id" SERIAL NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "aperturaId" INTEGER NOT NULL,

    CONSTRAINT "AvisoDescartado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvisoDescartado_carreraId_aperturaId_key" ON "AvisoDescartado"("carreraId", "aperturaId");

-- AddForeignKey
ALTER TABLE "AvisoDescartado" ADD CONSTRAINT "AvisoDescartado_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoDescartado" ADD CONSTRAINT "AvisoDescartado_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "Apertura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
