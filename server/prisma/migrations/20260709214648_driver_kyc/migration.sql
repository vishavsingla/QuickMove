-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "idDocUrl" TEXT,
ADD COLUMN     "kycNote" TEXT,
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "licenseDocUrl" TEXT;
