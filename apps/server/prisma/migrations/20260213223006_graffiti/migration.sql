-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stroke" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "color" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "opacity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stroke_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "r2Url" TEXT,
    "lastStrokeIdIncluded" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE INDEX "Stroke_roomId_createdAt_idx" ON "Stroke"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "Stroke_roomId_id_idx" ON "Stroke"("roomId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_r2Key_key" ON "Snapshot"("r2Key");

-- CreateIndex
CREATE INDEX "Snapshot_roomId_createdAt_idx" ON "Snapshot"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "Stroke" ADD CONSTRAINT "Stroke_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
