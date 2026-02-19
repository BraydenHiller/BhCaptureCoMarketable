-- CreateEnum
CREATE TYPE "GalleryProofingStatus" AS ENUM ('PENDING', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "maxSelections" INTEGER,
ADD COLUMN     "proofingStatus" "GalleryProofingStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ProofSelection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "clientUsername" TEXT NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofSelectionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofSelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofSelection_tenantId_galleryId_idx" ON "ProofSelection"("tenantId", "galleryId");

-- CreateIndex
CREATE INDEX "ProofSelection_tenantId_status_createdAt_idx" ON "ProofSelection"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProofSelection_galleryId_clientUsername_key" ON "ProofSelection"("galleryId", "clientUsername");

-- CreateIndex
CREATE INDEX "ProofSelectionItem_tenantId_selectionId_idx" ON "ProofSelectionItem"("tenantId", "selectionId");

-- CreateIndex
CREATE INDEX "ProofSelectionItem_tenantId_photoId_idx" ON "ProofSelectionItem"("tenantId", "photoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofSelectionItem_selectionId_photoId_key" ON "ProofSelectionItem"("selectionId", "photoId");

-- AddForeignKey
ALTER TABLE "ProofSelection" ADD CONSTRAINT "ProofSelection_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSelectionItem" ADD CONSTRAINT "ProofSelectionItem_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "ProofSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSelectionItem" ADD CONSTRAINT "ProofSelectionItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
