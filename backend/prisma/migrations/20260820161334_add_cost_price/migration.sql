-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductHistory" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Atualiza a funcao do trigger que roda no banco para incluir o costPrice
CREATE OR REPLACE FUNCTION "fc_auditoria_Product"()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for um UPDATE, fecha a data do registro anterior no historico
    IF (TG_OP = 'UPDATE') THEN
        UPDATE "ProductHistory" 
        SET "historyEnd" = now() 
        WHERE "productId" = OLD."id" 
        AND "historyEnd" IS NULL;
    END IF;

    -- Em ambos os casos (INSERT ou UPDATE), cria a nova versao no historico
    INSERT INTO "ProductHistory" (
        "productId", 
        "code",
        "name", 
        "price",
        "costPrice",
        "stock",
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
        NEW."modifierId",
        NEW."modifiedEndpoint",
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
