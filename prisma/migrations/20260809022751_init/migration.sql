-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Carrera" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    CONSTRAINT "Carrera_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "codigo" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "catedra" TEXT,
    "cargaHoraria" INTEGER,
    "docente" TEXT,
    "asesor" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'sin_novedad'
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carreraId" INTEGER NOT NULL,
    "asignaturaCodigo" TEXT NOT NULL,
    "orden" INTEGER,
    CONSTRAINT "PlanItem_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanItem_asignaturaCodigo_fkey" FOREIGN KEY ("asignaturaCodigo") REFERENCES "Asignatura" ("codigo") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cohorte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "carreraId" INTEGER NOT NULL,
    CONSTRAINT "Cohorte_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "inicioCursado" DATETIME NOT NULL,
    "aperturaInscripcion" DATETIME,
    "cierreInscripcion" DATETIME,
    CONSTRAINT "Periodo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Apertura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asignaturaCodigo" TEXT NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "inicioCursado" DATETIME,
    "aperturaInscripcion" DATETIME,
    "cierreInscripcion" DATETIME,
    "finCursado" DATETIME,
    "aperturaAfi" DATETIME,
    "cierreAfi" DATETIME,
    "cierreAsignatura" DATETIME,
    "actas" DATETIME,
    CONSTRAINT "Apertura_asignaturaCodigo_fkey" FOREIGN KEY ("asignaturaCodigo") REFERENCES "Asignatura" ("codigo") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Apertura_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AperturaCohorte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aperturaId" INTEGER NOT NULL,
    "cohorteId" INTEGER NOT NULL,
    "cursaEnEstaApertura" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AperturaCohorte_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "Apertura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AperturaCohorte_cohorteId_fkey" FOREIGN KEY ("cohorteId") REFERENCES "Cohorte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Carrera_unidadId_nombre_key" ON "Carrera"("unidadId", "nombre");

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
