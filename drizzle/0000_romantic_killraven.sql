CREATE TABLE "exchanges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_session_id" uuid NOT NULL,
	"list_name" text DEFAULT '' NOT NULL,
	"gift_amount" numeric(12, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchanges_gift_amount_nonnegative" CHECK ("exchanges"."gift_amount" >= 0),
	CONSTRAINT "exchanges_status_valid" CHECK ("exchanges"."status" in ('draft', 'drawn'))
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "guest_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exchange_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_name_not_blank" CHECK (length(trim("participants"."name")) > 0),
	CONSTRAINT "participants_email_not_blank" CHECK (length(trim("participants"."email")) > 0)
);
--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exchanges_guest_session_id_idx" ON "exchanges" USING btree ("guest_session_id");--> statement-breakpoint
CREATE INDEX "guest_sessions_expires_at_idx" ON "guest_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_exchange_email_idx" ON "participants" USING btree ("exchange_id",lower("email"));