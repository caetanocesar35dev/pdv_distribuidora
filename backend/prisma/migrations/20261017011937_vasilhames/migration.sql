-- CreateEnum
CREATE TYPE "BottleMovementType" AS ENUM ('CUSTOMER_BORROW', 'CUSTOMER_RETURN', 'SUPPLIER_SEND', 'SUPPLIER_RECEIVE', 'MANUAL_ADJUSTMENT');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bottleTypeId" INTEGER;

-- CreateTable
CREATE TABLE "BottleType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BottleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBottleBalance" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "bottleTypeId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBottleBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleMovement" (
    "id" SERIAL NOT NULL,
    "bottleTypeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "BottleMovementType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" INTEGER,
    "saleId" INTEGER,

    CONSTRAINT "BottleMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BottleType_name_key" ON "BottleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBottleBalance_customerId_bottleTypeId_key" ON "CustomerBottleBalance"("customerId", "bottleTypeId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_bottleTypeId_fkey" FOREIGN KEY ("bottleTypeId") REFERENCES "BottleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBottleBalance" ADD CONSTRAINT "CustomerBottleBalance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBottleBalance" ADD CONSTRAINT "CustomerBottleBalance_bottleTypeId_fkey" FOREIGN KEY ("bottleTypeId") REFERENCES "BottleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleMovement" ADD CONSTRAINT "BottleMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleMovement" ADD CONSTRAINT "BottleMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleMovement" ADD CONSTRAINT "BottleMovement_bottleTypeId_fkey" FOREIGN KEY ("bottleTypeId") REFERENCES "BottleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
