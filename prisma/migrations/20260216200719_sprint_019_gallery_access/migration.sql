-- CreateEnum
CREATE TYPE "GalleryAccessMode" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "accessMode" "GalleryAccessMode" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "clientPasswordHash" TEXT,
ADD COLUMN     "clientUsername" TEXT;

-- CreateIndex
CREATE INDEX "Gallery_accessMode_idx" ON "Gallery"("accessMode");
