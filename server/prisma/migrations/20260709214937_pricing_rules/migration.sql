-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "base" DOUBLE PRECISION NOT NULL,
    "perKm" DOUBLE PRECISION NOT NULL,
    "perMin" DOUBLE PRECISION NOT NULL,
    "minFare" DOUBLE PRECISION NOT NULL,
    "peakSurge" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_vehicleType_key" ON "PricingRule"("vehicleType");
