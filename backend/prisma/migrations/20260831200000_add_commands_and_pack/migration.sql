-- AlterTable: Adiciona packQuantity ao Product e ProductHistory
ALTER TABLE "Product" ADD COLUMN "packQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProductHistory" ADD COLUMN "packQuantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: Adiciona campos faltantes na Sale
ALTER TABLE "Sale" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Sale" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "CommandTab" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" INTEGER,

    CONSTRAINT "CommandTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandItem" (
    "id" SERIAL NOT NULL,
    "commandTabId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommandItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Adiciona relação de comanda na Sale
ALTER TABLE "Sale" ADD COLUMN "commandTabId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_commandTabId_key" ON "Sale"("commandTabId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_commandTabId_fkey" FOREIGN KEY ("commandTabId") REFERENCES "CommandTab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandTab" ADD CONSTRAINT "CommandTab_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandItem" ADD CONSTRAINT "CommandItem_commandTabId_fkey" FOREIGN KEY ("commandTabId") REFERENCES "CommandTab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandItem" ADD CONSTRAINT "CommandItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Atualiza o trigger de auditoria para incluir packQuantity
CREATE OR REPLACE FUNCTION "fc_auditoria_Product"()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        UPDATE "ProductHistory" 
        SET "historyEnd" = now() 
        WHERE "productId" = OLD."id" 
        AND "historyEnd" IS NULL;
    END IF;

    INSERT INTO "ProductHistory" (
        "productId", 
        "code",
        "name", 
        "price",
        "costPrice",
        "stock",
        "packQuantity",
        "modifierId",
        "modifiedEndpoint",
        "historyStart"
    ) VALUES (
        NEW."id",
        NEW."code",
        NEW."name",
        NEW."price",
        NEW."costPrice",
        NEW."stock",
        NEW."packQuantity",
        NEW."modifierId",
        NEW."modifiedEndpoint",
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
