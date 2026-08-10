-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrera" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,

    CONSTRAINT "Carrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'consulta',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioCarrera" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "carreraId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioCarrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cambio" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "asignaturaCodigo" TEXT,
    "carreraId" INTEGER,

    CONSTRAINT "Cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "catedra" TEXT,
    "cargaHoraria" INTEGER,
    "docente" TEXT,
    "asesor" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'sin_novedad',

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" SERIAL NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "asignaturaCodigo" TEXT NOT NULL,
    "orden" INTEGER,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohorte" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "carreraId" INTEGER NOT NULL,

    CONSTRAINT "Cohorte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "mes" TEXT,
    "inicioCursado" TIMESTAMP(3) NOT NULL,
    "aperturaInscripcion" TIMESTAMP(3),
    "cierreInscripcion" TIMESTAMP(3),
    "finCursado" TIMESTAMP(3),
    "aperturaAfi" TIMESTAMP(3),
    "cierreAfi" TIMESTAMP(3),
    "cierreAsignatura" TIMESTAMP(3),
    "actas" TIMESTAMP(3),

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apertura" (
    "id" SERIAL NOT NULL,
    "asignaturaCodigo" TEXT NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "inicioCursado" TIMESTAMP(3),
    "aperturaInscripcion" TIMESTAMP(3),
    "cierreInscripcion" TIMESTAMP(3),
    "finCursado" TIMESTAMP(3),
    "aperturaAfi" TIMESTAMP(3),
    "cierreAfi" TIMESTAMP(3),
    "cierreAsignatura" TIMESTAMP(3),
    "actas" TIMESTAMP(3),

    CONSTRAINT "Apertura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AperturaCohorte" (
    "id" SERIAL NOT NULL,
    "aperturaId" INTEGER NOT NULL,
    "cohorteId" INTEGER NOT NULL,
    "cursaEnEstaApertura" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AperturaCohorte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carrera_unidadId_nombre_key" ON "Carrera"("unidadId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCarrera_usuarioId_carreraId_key" ON "UsuarioCarrera"("usuarioId", "carreraId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItem_carreraId_asignaturaCodigo_key" ON "PlanItem"("carreraId", "asignaturaCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cohorte_carreraId_nombre_key" ON "Cohorte"("carreraId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_unidadId_nombre_key" ON "Periodo"("unidadId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Apertura_asignaturaCodigo_periodoId_key" ON "Apertura"("asignaturaCodigo", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "AperturaCohorte_aperturaId_cohorteId_key" ON "AperturaCohorte"("aperturaId", "cohorteId");

-- AddForeignKey
ALTER TABLE "Carrera" ADD CONSTRAINT "Carrera_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCarrera" ADD CONSTRAINT "UsuarioCarrera_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCarrera" ADD CONSTRAINT "UsuarioCarrera_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_asignaturaCodigo_fkey" FOREIGN KEY ("asignaturaCodigo") REFERENCES "Asignatura"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohorte" ADD CONSTRAINT "Cohorte_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periodo" ADD CONSTRAINT "Periodo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apertura" ADD CONSTRAINT "Apertura_asignaturaCodigo_fkey" FOREIGN KEY ("asignaturaCodigo") REFERENCES "Asignatura"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apertura" ADD CONSTRAINT "Apertura_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AperturaCohorte" ADD CONSTRAINT "AperturaCohorte_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "Apertura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AperturaCohorte" ADD CONSTRAINT "AperturaCohorte_cohorteId_fkey" FOREIGN KEY ("cohorteId") REFERENCES "Cohorte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

