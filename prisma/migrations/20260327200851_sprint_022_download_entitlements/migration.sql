/*
  Warnings:

  - You are about to drop the column `createdAt` on the `PurchaseItem` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DownloadEntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "downloadExpiryDays" INTEGER,
ADD COLUMN     "previewLowResEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PurchaseItem" DROP COLUMN "createdAt";

-- CreateTable
CREATE TABLE "DownloadEntitlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "clientUsername" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "grantedByUserId" TEXT,
    "revokedByUserId" TEXT,
    "status" "DownloadEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownloadEntitlement_tenantId_idx" ON "DownloadEntitlement"("tenantId");

-- CreateIndex
CREATE INDEX "DownloadEntitlement_expiresAt_idx" ON "DownloadEntitlement"("expiresAt");

-- CreateIndex
CREATE INDEX "DownloadEntitlement_status_idx" ON "DownloadEntitlement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadEntitlement_galleryId_clientUsername_photoId_key" ON "DownloadEntitlement"("galleryId", "clientUsername", "photoId");

-- AddForeignKey
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEntitlement" ADD CONSTRAINT "DownloadEntitlement_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
