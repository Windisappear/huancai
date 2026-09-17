CREATE TABLE "ProviderAccount" (
  "id" TEXT NOT NULL PRIMARY KEY, "channelId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "secretEnv" TEXT NOT NULL, "group" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true, "maxInFlight" INTEGER NOT NULL DEFAULT 2,
  "cooldownUntil" TIMESTAMP(3), "lastUsedAt" TIMESTAMP(3), "lastError" TEXT,
  "checkedAt" TIMESTAMP(3), "accessibleModels" JSONB,
  CONSTRAINT "account_capacity_positive" CHECK ("maxInFlight" BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "ProviderAccount_secretEnv_key" ON "ProviderAccount"("secretEnv");
CREATE INDEX "ProviderAccount_channelId_enabled_idx" ON "ProviderAccount"("channelId", "enabled");
CREATE TABLE "ModelRoute" (
  "id" TEXT NOT NULL PRIMARY KEY, "modelId" TEXT NOT NULL, "channelId" TEXT NOT NULL,
  "upstreamModel" TEXT NOT NULL, "adapter" TEXT NOT NULL, "mode" TEXT NOT NULL,
  "size" TEXT NOT NULL, "quality" TEXT NOT NULL, "params" JSONB NOT NULL,
  "requiredGroup" TEXT NOT NULL DEFAULT 'default', "costMicros" INTEGER NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0, "maxReferences" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "priceNote" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "route_cost_nonnegative" CHECK ("costMicros" >= 0)
);
CREATE INDEX "ModelRoute_modelId_enabled_idx" ON "ModelRoute"("modelId", "enabled");
ALTER TABLE "Model" ADD COLUMN "pooled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "accountId" TEXT, ADD COLUMN "routeId" TEXT,
 ADD COLUMN "endpointBaseUrl" TEXT, ADD COLUMN "credentialEnv" TEXT,
 ADD COLUMN "upstreamParams" JSONB, ADD COLUMN "estimatedCostMicros" INTEGER;
CREATE INDEX "Task_accountId_settledAt_idx" ON "Task"("accountId", "settledAt");
