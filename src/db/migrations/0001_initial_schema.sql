CREATE TYPE "public"."dealer_member_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."dealer_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'PAUSED', 'SOLD', 'EXPIRED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('APPROVE', 'REJECT', 'PAUSE', 'RESTORE', 'ARCHIVE', 'DISMISS_REPORT');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('MESSAGE_RECEIVED', 'LISTING_APPROVED', 'LISTING_REJECTED', 'LISTING_PAUSED', 'LISTING_RESTORED', 'LISTING_EXPIRED', 'PROMOTION_ACTIVATED', 'SAVED_SEARCH_MATCH');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('DEMO');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('TOP', 'VIP', 'HIGHLIGHT', 'REFRESH');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('FAKE', 'INCORRECT_INFO', 'DUPLICATE', 'INAPPROPRIATE', 'SUSPICIOUS_SELLER', 'SOLD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'DEALER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone" text,
	"city_id" uuid,
	"about" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_region_center" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"attribute_set" text NOT NULL,
	"vehicle_type" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"year_from" smallint NOT NULL,
	"year_to" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_generations_model_slug_unique" UNIQUE("model_id","slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_makes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_makes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_models_make_slug_type_unique" UNIQUE("make_id","slug","vehicle_type")
);
--> statement-breakpoint
CREATE TABLE "dealer_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city_id" uuid,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dealer_members" (
	"dealer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "dealer_member_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dealer_members_dealer_id_user_id_pk" PRIMARY KEY("dealer_id","user_id"),
	CONSTRAINT "dealer_members_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "dealer_opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" text,
	"closes_at" text,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "dealer_opening_hours_day_unique" UNIQUE("dealer_id","day_of_week")
);
--> statement-breakpoint
CREATE TABLE "dealers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"logo_storage_path" text,
	"phone" text NOT NULL,
	"email" text,
	"website" text,
	"region_id" uuid,
	"city_id" uuid,
	"address" text DEFAULT '' NOT NULL,
	"status" "dealer_status" DEFAULT 'ACTIVE' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dealers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "listing_attributes" (
	"listing_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value_text" text,
	"value_number" numeric,
	"value_bool" boolean,
	CONSTRAINT "listing_attributes_listing_id_key_pk" PRIMARY KEY("listing_id","key")
);
--> statement-breakpoint
CREATE TABLE "listing_features" (
	"listing_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	CONSTRAINT "listing_features_listing_id_feature_key_pk" PRIMARY KEY("listing_id","feature_key")
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"thumb_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"thumb_storage_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"old_price_cents" bigint NOT NULL,
	"new_price_cents" bigint NOT NULL,
	"changed_by_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_view_events" (
	"listing_id" uuid NOT NULL,
	"viewer_hash" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "listing_view_events_listing_id_viewer_hash_day_pk" PRIMARY KEY("listing_id","viewer_hash","day")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "listings_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 10000001 CACHE 1),
	"slug" text DEFAULT '' NOT NULL,
	"category_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"dealer_id" uuid,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" bigint,
	"price_negotiable" boolean DEFAULT false NOT NULL,
	"condition" text,
	"make_id" uuid,
	"model_id" uuid,
	"generation_id" uuid,
	"year" smallint,
	"mileage_km" integer,
	"fuel" text,
	"gearbox" text,
	"power_hp" smallint,
	"engine_cc" integer,
	"drivetrain" text,
	"body_type" text,
	"color" text,
	"region_id" uuid,
	"city_id" uuid,
	"contact_name" text,
	"contact_phone" text,
	"cover_image_url" text,
	"image_count" smallint DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"inquiry_count" integer DEFAULT 0 NOT NULL,
	"previous_price_cents" bigint,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"sort_date" timestamp with time zone DEFAULT now() NOT NULL,
	"vip_until" timestamp with time zone,
	"top_until" timestamp with time zone,
	"highlight_until" timestamp with time zone,
	"rejection_reason" text,
	"draft_step" smallint DEFAULT 1 NOT NULL,
	"search_document" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', search_document)) STORED,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_number_unique" UNIQUE("number"),
	CONSTRAINT "listings_price_non_negative" CHECK ("listings"."price_cents" IS NULL OR "listings"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "recently_viewed" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recently_viewed_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"filters" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participants_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_listing_buyer_unique" UNIQUE("listing_id","buyer_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"report_id" uuid,
	"moderator_id" uuid NOT NULL,
	"action" "moderation_action_type" NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"previous_status" "listing_status",
	"new_status" "listing_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"promotion_type" "promotion_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"provider" "payment_provider" DEFAULT 'DEMO' NOT NULL,
	"provider_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_currency_eur" CHECK ("payments"."currency" = 'EUR'),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"payment_id" uuid,
	"type" "promotion_type" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dev_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_make_id_vehicle_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_makes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_locations" ADD CONSTRAINT "dealer_locations_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_locations" ADD CONSTRAINT "dealer_locations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_members" ADD CONSTRAINT "dealer_members_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_members" ADD CONSTRAINT "dealer_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_opening_hours" ADD CONSTRAINT "dealer_opening_hours_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_features" ADD CONSTRAINT "listing_features_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_price_history" ADD CONSTRAINT "listing_price_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_price_history" ADD CONSTRAINT "listing_price_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_view_events" ADD CONSTRAINT "listing_view_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_make_id_vehicle_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_makes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_listing_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."listing_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verification_tokens_identifier_idx" ON "verification_tokens" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "cities_region_id_idx" ON "cities" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "vehicle_models_type_make_idx" ON "vehicle_models" USING btree ("vehicle_type","make_id");--> statement-breakpoint
CREATE INDEX "dealer_locations_dealer_idx" ON "dealer_locations" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "dealers_city_idx" ON "dealers" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "dealers_region_idx" ON "dealers" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "dealers_name_trgm_idx" ON "dealers" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "listing_attributes_key_text_idx" ON "listing_attributes" USING btree ("key","value_text");--> statement-breakpoint
CREATE INDEX "listing_attributes_key_number_idx" ON "listing_attributes" USING btree ("key","value_number");--> statement-breakpoint
CREATE INDEX "listing_features_feature_idx" ON "listing_features" USING btree ("feature_key","listing_id");--> statement-breakpoint
CREATE INDEX "listing_images_listing_position_idx" ON "listing_images" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listing_price_history_listing_idx" ON "listing_price_history" USING btree ("listing_id","changed_at");--> statement-breakpoint
CREATE INDEX "listing_view_events_day_idx" ON "listing_view_events" USING btree ("day");--> statement-breakpoint
CREATE INDEX "listings_status_category_sort_idx" ON "listings" USING btree ("status","category_id","sort_date");--> statement-breakpoint
CREATE INDEX "listings_make_model_idx" ON "listings" USING btree ("make_id","model_id");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price_cents");--> statement-breakpoint
CREATE INDEX "listings_year_idx" ON "listings" USING btree ("year");--> statement-breakpoint
CREATE INDEX "listings_mileage_idx" ON "listings" USING btree ("mileage_km");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_region_idx" ON "listings" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "listings_dealer_idx" ON "listings" USING btree ("dealer_id","status");--> statement-breakpoint
CREATE INDEX "listings_expires_at_idx" ON "listings" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "listings_search_vector_idx" ON "listings" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "listings_search_document_trgm_idx" ON "listings" USING gin ("search_document" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "favorites_listing_idx" ON "favorites" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "recently_viewed_user_idx" ON "recently_viewed" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "listing_reports_status_idx" ON "listing_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "listing_reports_listing_idx" ON "listing_reports" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_reports_open_unique" ON "listing_reports" USING btree ("listing_id","reporter_id") WHERE status = 'OPEN';--> statement-breakpoint
CREATE INDEX "moderation_actions_listing_idx" ON "moderation_actions" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_listing_idx" ON "payments" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "promotions_listing_idx" ON "promotions" USING btree ("listing_id","ends_at");--> statement-breakpoint
CREATE INDEX "promotions_ends_at_idx" ON "promotions" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "rate_limits_window_end_idx" ON "rate_limits" USING btree ("window_end");