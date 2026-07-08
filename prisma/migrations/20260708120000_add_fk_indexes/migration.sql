-- Index hot foreign-key lookups used by the complete/pay/results flows.
CREATE INDEX "ReportJob_sessionId_createdAt_idx" ON "ReportJob"("sessionId", "createdAt");
CREATE INDEX "Payment_sessionId_createdAt_idx" ON "Payment"("sessionId", "createdAt");
