-- CreateTable
CREATE TABLE "AperturaDocente" (
    "id" SERIAL NOT NULL,
    "aperturaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AperturaDocente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AperturaDocente_aperturaId_nombre_key" ON "AperturaDocente"("aperturaId", "nombre");

-- AddForeignKey
ALTER TABLE "AperturaDocente" ADD CONSTRAINT "AperturaDocente_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "Apertura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
