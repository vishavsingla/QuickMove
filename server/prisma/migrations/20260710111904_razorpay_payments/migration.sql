-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "cancelReason" TEXT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'BOOKING',
ADD COLUMN "razorpayPaymentId" TEXT;
