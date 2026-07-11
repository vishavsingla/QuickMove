-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "VerificationOtp" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'verification',
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationOtp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "VerificationOtp_target_channel_createdAt_idx" ON "VerificationOtp"("target", "channel", "createdAt");

DO $$ BEGIN
  ALTER TABLE "VerificationOtp" ADD CONSTRAINT "VerificationOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
