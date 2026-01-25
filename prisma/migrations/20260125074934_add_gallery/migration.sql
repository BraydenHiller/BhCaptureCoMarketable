-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gallery_tenantId_idx" ON "Gallery"("tenantId");

-- CreateIndex
CREATE INDEX "Gallery_tenantId_createdAt_idx" ON "Gallery"("tenantId", "createdAt");
