/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeAccountId_key" ON "Tenant"("stripeAccountId");
