CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exchange_id" uuid NOT NULL,
	"santa_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claim_id" uuid,
	"started_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	CONSTRAINT "assignments_no_self" CHECK ("assignments"."santa_id" <> "assignments"."recipient_id"),
	CONSTRAINT "assignments_status_valid" CHECK ("assignments"."delivery_status" in ('pending', 'sending', 'sent', 'failed', 'unknown'))
);
--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "last_save_key" uuid;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_santa_id_participants_id_fk" FOREIGN KEY ("santa_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_recipient_id_participants_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_santa_idx" ON "assignments" USING btree ("exchange_id","santa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_recipient_idx" ON "assignments" USING btree ("exchange_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exchanges_one_active_per_guest_idx" ON "exchanges" USING btree ("guest_session_id") WHERE "exchanges"."completed_at" is null;