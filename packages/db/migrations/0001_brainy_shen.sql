CREATE TABLE "daily_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"utc_day" text NOT NULL,
	"confirmed_principal_turnover_atomic" text NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"fee_totals" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"chain_id" integer NOT NULL,
	"transaction_hash" text NOT NULL,
	"role" text NOT NULL,
	"receipt_status" text NOT NULL,
	"block_number" bigint,
	"actual_gas_fee_atomic18" text,
	"log_references" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"block_number" bigint NOT NULL,
	"block_hash" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"native_usdc_atomic18" text NOT NULL,
	"erc20_balances" jsonb NOT NULL,
	"token_metadata_version" text NOT NULL,
	"reconciliation_state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"destination_address" text NOT NULL,
	"asset_id" text NOT NULL,
	"amount_atomic" text NOT NULL,
	"authorization_id" uuid NOT NULL,
	"state" text NOT NULL,
	"provider_reference" jsonb,
	"receipt_reference" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_wallet_id_trading_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."trading_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_transactions" ADD CONSTRAINT "execution_transactions_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_snapshots" ADD CONSTRAINT "wallet_snapshots_wallet_id_trading_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."trading_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_trading_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."trading_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_authorization_id_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."authorizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_usage_wallet_day_uq" ON "daily_usage" USING btree ("wallet_id","utc_day");--> statement-breakpoint
CREATE UNIQUE INDEX "execution_transaction_chain_hash_uq" ON "execution_transactions" USING btree ("chain_id","transaction_hash");--> statement-breakpoint
CREATE INDEX "wallet_snapshots_wallet_idx" ON "wallet_snapshots" USING btree ("wallet_id");