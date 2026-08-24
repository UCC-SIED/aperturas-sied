-- DropTable
DROP TABLE "ReinicioContrasena";

-- CreateTable
CREATE TABLE "PedidoContrasena" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto" TIMESTAMP(3),

    CONSTRAINT "PedidoContrasena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoContrasena_usuarioId_idx" ON "PedidoContrasena"("usuarioId");

-- AddForeignKey
ALTER TABLE "PedidoContrasena" ADD CONSTRAINT "PedidoContrasena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
