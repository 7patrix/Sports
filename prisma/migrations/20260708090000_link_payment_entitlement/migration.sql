-- Link a payment to the entitlement it granted/renewed
ALTER TABLE "Payment" ADD COLUMN "entitlementId" TEXT;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_entitlementId_idx" ON "Payment"("entitlementId");
