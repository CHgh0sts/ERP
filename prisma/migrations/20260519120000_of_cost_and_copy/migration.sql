-- OF: copie, couts production, lignes composants enrichies
ALTER TABLE "manufacturing_order" ADD COLUMN IF NOT EXISTS "copiedFromOfId" TEXT;
ALTER TABLE "manufacturing_order" ADD COLUMN IF NOT EXISTS "laborCostHT" DOUBLE PRECISION;
ALTER TABLE "manufacturing_order" ADD COLUMN IF NOT EXISTS "overheadCostHT" DOUBLE PRECISION;

ALTER TABLE "of_reservation" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "of_reservation" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "of_reservation" ADD COLUMN IF NOT EXISTS "unitCostHT" DOUBLE PRECISION;

DROP INDEX IF EXISTS "of_reservation_ofId_articleId_key";

CREATE INDEX IF NOT EXISTS "manufacturing_order_copiedFromOfId_idx" ON "manufacturing_order"("copiedFromOfId");
CREATE INDEX IF NOT EXISTS "of_reservation_ofId_idx" ON "of_reservation"("ofId");
CREATE INDEX IF NOT EXISTS "of_reservation_articleId_idx" ON "of_reservation"("articleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manufacturing_order_copiedFromOfId_fkey'
  ) THEN
    ALTER TABLE "manufacturing_order"
      ADD CONSTRAINT "manufacturing_order_copiedFromOfId_fkey"
      FOREIGN KEY ("copiedFromOfId") REFERENCES "manufacturing_order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
