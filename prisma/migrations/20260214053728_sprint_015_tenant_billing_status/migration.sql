-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
