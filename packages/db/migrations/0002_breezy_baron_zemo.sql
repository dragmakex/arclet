ALTER TABLE "executions" ADD COLUMN "authorization_epoch" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "submitted_payload_hash" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "provider_reference" jsonb;