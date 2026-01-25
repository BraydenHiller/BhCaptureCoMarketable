-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "storageKey" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Photo_tenantId_galleryId_idx" ON "Photo"("tenantId", "galleryId");

-- CreateIndex
CREATE INDEX "Photo_tenantId_createdAt_idx" ON "Photo"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
