-- Defense in depth: financial invariants remain true even outside application transactions.
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_nonnegative" CHECK (available >= 0 AND frozen >= 0);
ALTER TABLE "Price" ADD CONSTRAINT "price_positive" CHECK ("unitCents" > 0 AND "unitCents" <= 100000);
ALTER TABLE "Task" ADD CONSTRAINT "task_amount_bounds" CHECK (count BETWEEN 1 AND 4 AND "unitCents" > 0 AND "deliveredCount" BETWEEN 0 AND count);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_amount_bounds" CHECK (amount > 0 AND refunded >= 0 AND refunded <= amount);
ALTER TABLE "Refund" ADD CONSTRAINT "refund_positive" CHECK (amount > 0);
ALTER TABLE "Session" ADD CONSTRAINT "session_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Ledger" ADD CONSTRAINT "ledger_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Model" ADD CONSTRAINT "model_channel" FOREIGN KEY ("channelId") REFERENCES "Channel"(id);
ALTER TABLE "Price" ADD CONSTRAINT "price_model" FOREIGN KEY ("modelId") REFERENCES "Model"(id);
ALTER TABLE "Quote" ADD CONSTRAINT "quote_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Task" ADD CONSTRAINT "task_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "TaskContent" ADD CONSTRAINT "content_task" FOREIGN KEY ("taskId") REFERENCES "Task"(id);
ALTER TABLE "Asset" ADD CONSTRAINT "asset_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Asset" ADD CONSTRAINT "asset_task" FOREIGN KEY ("taskId") REFERENCES "Task"(id);
ALTER TABLE "Outbox" ADD CONSTRAINT "outbox_task" FOREIGN KEY ("taskId") REFERENCES "Task"(id);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_user" FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "Refund" ADD CONSTRAINT "refund_payment" FOREIGN KEY ("paymentId") REFERENCES "Payment"(id);
CREATE FUNCTION reject_ledger_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are append-only; record a compensating entry instead'; END;
$$;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON "Ledger" FOR EACH ROW EXECUTE FUNCTION reject_ledger_update();
