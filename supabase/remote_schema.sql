


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."admin_action" AS ENUM (
    'approve_landlord',
    'reject_landlord',
    'approve_listing',
    'reject_listing',
    'flag',
    'unflag',
    'suspend'
);


ALTER TYPE "public"."admin_action" OWNER TO "postgres";


CREATE TYPE "public"."admin_target_type" AS ENUM (
    'landlord',
    'listing'
);


ALTER TYPE "public"."admin_target_type" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'student',
    'lister',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."gender_preference" AS ENUM (
    'any',
    'male',
    'female'
);


ALTER TYPE "public"."gender_preference" OWNER TO "postgres";


CREATE TYPE "public"."inquiry_status" AS ENUM (
    'open',
    'interested',
    'unavailable',
    'booked'
);


ALTER TYPE "public"."inquiry_status" OWNER TO "postgres";


CREATE TYPE "public"."lister_type" AS ENUM (
    'owner',
    'manager',
    'dalali'
);


ALTER TYPE "public"."lister_type" OWNER TO "postgres";


CREATE TYPE "public"."listing_photo_angle" AS ENUM (
    'bedroom',
    'kitchen',
    'bathroom',
    'outside'
);


ALTER TYPE "public"."listing_photo_angle" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'flagged',
    'suspended'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."room_type" AS ENUM (
    'single',
    'shared',
    'bedsit',
    'studio',
    'apartment'
);


ALTER TYPE "public"."room_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan" AS ENUM (
    'free',
    'verified',
    'premium'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


CREATE TYPE "public"."vacancy_status" AS ENUM (
    'available',
    'occupied',
    'coming_soon'
);


ALTER TYPE "public"."vacancy_status" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'unverified',
    'pending',
    'verified',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_action_handler"("p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor uuid := auth.uid();
  action_key text := lower(trim(coalesce(p_action, '')));
  target_key text := lower(trim(coalesce(p_target_type, '')));
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
  next_listing_status public.listing_status;
  next_profile_status public.verification_status;
  logged_action public.admin_action;
  logged_target public.admin_target_type;
begin
  if actor is null or not public.is_admin(actor) then
    raise exception 'Admin role required';
  end if;

  if target_key = 'listing' then
    logged_target := 'listing';

    case action_key
      when 'approve', 'approve_listing' then
        next_listing_status := 'approved';
        logged_action := 'approve_listing';
      when 'reject', 'reject_listing' then
        next_listing_status := 'rejected';
        logged_action := 'reject_listing';
      when 'flag' then
        next_listing_status := 'flagged';
        logged_action := 'flag';
      when 'unflag' then
        next_listing_status := 'pending';
        logged_action := 'unflag';
      when 'suspend' then
        next_listing_status := 'suspended';
        logged_action := 'suspend';
      else
        raise exception 'Unsupported listing action: %', p_action;
    end case;

    update public.listings
    set status = next_listing_status,
        rejection_reason = case when next_listing_status = 'rejected' then normalized_reason else null end,
        updated_at = now()
    where id = p_target_id;

    if not found then
      raise exception 'Listing not found';
    end if;

  elsif target_key in ('landlord', 'lister', 'profile') then
    logged_target := 'landlord';

    case action_key
      when 'approve', 'approve_landlord' then
        next_profile_status := 'verified';
        logged_action := 'approve_landlord';
      when 'reject', 'reject_landlord' then
        next_profile_status := 'rejected';
        logged_action := 'reject_landlord';
      when 'suspend' then
        next_profile_status := 'suspended';
        logged_action := 'suspend';
      else
        raise exception 'Unsupported landlord action: %', p_action;
    end case;

    update public.profiles
    set verification_status = next_profile_status,
        updated_at = now()
    where id = p_target_id
      and role in ('lister', 'admin');

    if not found then
      raise exception 'Landlord profile not found';
    end if;

  else
    raise exception 'Unsupported target type: %', p_target_type;
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason)
  values (actor, logged_action, logged_target, p_target_id, normalized_reason);

  return jsonb_build_object(
    'ok', true,
    'action', logged_action,
    'target_type', logged_target,
    'target_id', p_target_id
  );
end;
$$;


ALTER FUNCTION "public"."admin_action_handler"("p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_phone_otps"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from public.phone_verification_codes
    where expires_at < now() - interval '1 day'
       or used_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into deleted_count from removed;

  return coalesce(deleted_count, 0);
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_phone_otps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stale_listing_drafts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from public.listing_drafts
    where updated_at < now() - interval '45 days'
    returning 1
  )
  select count(*) into deleted_count from removed;

  return coalesce(deleted_count, 0);
end;
$$;


ALTER FUNCTION "public"."cleanup_stale_listing_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    phone,
    verification_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'New User'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'unverified',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_listing_view"("p_listing_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  next_count bigint;
begin
  update public.listings
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_listing_id
    and status = 'approved'
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;


ALTER FUNCTION "public"."increment_listing_view"("p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("target_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_lister"("target_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role in ('lister', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_lister"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_phone_otp"("p_phone" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor uuid := auth.uid();
  normalized_phone text;
  generated_code text;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  normalized_phone := regexp_replace(coalesce(trim(p_phone), ''), '\\s+', '', 'g');

  if char_length(normalized_phone) < 9 then
    raise exception 'Invalid phone number';
  end if;

  generated_code := lpad((floor(random() * 1000000)::int)::text, 6, '0');

  insert into public.phone_verification_codes (user_id, phone, code, expires_at)
  values (actor, normalized_phone, generated_code, now() + interval '10 minutes');

  return jsonb_build_object(
    'sent', true,
    'expires_in_seconds', 600,
    -- Returned to simplify early integration. Remove in strict production mode.
    'code', generated_code
  );
end;
$$;


ALTER FUNCTION "public"."request_phone_otp"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_listing"("p_listing" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor uuid := auth.uid();
  next_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  if not (public.is_lister(actor) or public.is_admin(actor)) then
    raise exception 'Lister role required';
  end if;

  insert into public.listings (
    lister_id,
    title,
    description,
    room_type,
    gender_preference,
    price_monthly,
    utilities_included,
    region,
    district,
    ward,
    street,
    lat,
    lng,
    amenities,
    house_rules,
    available_from,
    vacancy_status,
    status,
    featured,
    promotion_level,
    near_universities
  )
  values (
    actor,
    coalesce(p_listing ->> 'title', ''),
    coalesce(p_listing ->> 'description', ''),
    coalesce((p_listing ->> 'room_type')::public.room_type, 'single'),
    coalesce((p_listing ->> 'gender_preference')::public.gender_preference, 'any'),
    coalesce((p_listing ->> 'price_monthly')::integer, 0),
    coalesce((p_listing ->> 'utilities_included')::boolean, false),
    coalesce(p_listing ->> 'region', ''),
    coalesce(p_listing ->> 'district', ''),
    coalesce(p_listing ->> 'ward', ''),
    coalesce(p_listing ->> 'street', ''),
    nullif(p_listing ->> 'lat', '')::numeric,
    nullif(p_listing ->> 'lng', '')::numeric,
    coalesce((p_listing -> 'amenities')::jsonb, '{}'::jsonb),
    p_listing ->> 'house_rules',
    nullif(p_listing ->> 'available_from', '')::date,
    coalesce((p_listing ->> 'vacancy_status')::public.vacancy_status, 'available'),
    'pending',
    false,
    0,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_listing -> 'near_universities', '[]'::jsonb))), '{}')
  )
  returning id into next_id;

  return next_id;
end;
$$;


ALTER FUNCTION "public"."submit_listing"("p_listing" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.conversations
  set last_message_at = now(),
      updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."touch_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_phone_otp"("p_phone" "text", "p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor uuid := auth.uid();
  normalized_phone text;
  normalized_code text;
  match_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  normalized_phone := regexp_replace(coalesce(trim(p_phone), ''), '\\s+', '', 'g');
  normalized_code := trim(coalesce(p_code, ''));

  select pvc.id
    into match_id
  from public.phone_verification_codes pvc
  where pvc.user_id = actor
    and pvc.phone = normalized_phone
    and pvc.code = normalized_code
    and pvc.used_at is null
    and pvc.expires_at > now()
  order by pvc.created_at desc
  limit 1;

  if match_id is null then
    return jsonb_build_object('verified', false, 'reason', 'invalid_or_expired_code');
  end if;

  update public.phone_verification_codes
  set used_at = now()
  where id = match_id;

  update public.profiles
  set phone = normalized_phone,
      phone_verified = true,
      updated_at = now()
  where id = actor;

  return jsonb_build_object('verified', true);
end;
$$;


ALTER FUNCTION "public"."verify_phone_otp"("p_phone" "text", "p_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "public"."admin_action" NOT NULL,
    "target_type" "public"."admin_target_type" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lister_id" "uuid" NOT NULL,
    "inquiry_status" "public"."inquiry_status" DEFAULT 'open'::"public"."inquiry_status" NOT NULL,
    "move_in_date" "date",
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."conversations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_drafts" (
    "lister_id" "uuid" NOT NULL,
    "current_step" integer DEFAULT 1 NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listing_drafts_current_step_check" CHECK ((("current_step" >= 1) AND ("current_step" <= 5)))
);


ALTER TABLE "public"."listing_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "angle" "public"."listing_photo_angle" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "ai_verified" boolean,
    "ai_confidence" numeric(5,4),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."listing_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lister_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "room_type" "public"."room_type" NOT NULL,
    "gender_preference" "public"."gender_preference" DEFAULT 'any'::"public"."gender_preference" NOT NULL,
    "price_monthly" integer NOT NULL,
    "utilities_included" boolean DEFAULT false NOT NULL,
    "region" "text" NOT NULL,
    "district" "text" NOT NULL,
    "ward" "text" NOT NULL,
    "street" "text" NOT NULL,
    "lat" numeric(9,6),
    "lng" numeric(9,6),
    "amenities" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "house_rules" "text",
    "available_from" "date",
    "vacancy_status" "public"."vacancy_status" DEFAULT 'available'::"public"."vacancy_status" NOT NULL,
    "status" "public"."listing_status" DEFAULT 'pending'::"public"."listing_status" NOT NULL,
    "rejection_reason" "text",
    "featured" boolean DEFAULT false NOT NULL,
    "promotion_level" integer DEFAULT 0 NOT NULL,
    "promotion_expires_at" timestamp with time zone,
    "view_count" integer DEFAULT 0 NOT NULL,
    "near_universities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listings_price_monthly_check" CHECK (("price_monthly" >= 0))
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_verification_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'student'::"public"."app_role" NOT NULL,
    "lister_type" "public"."lister_type",
    "full_name" "text" NOT NULL,
    "phone" "text",
    "phone_verified" boolean DEFAULT false NOT NULL,
    "university" "text",
    "profile_photo_url" "text",
    "id_doc_url" "text",
    "selfie_url" "text",
    "verification_status" "public"."verification_status" DEFAULT 'unverified'::"public"."verification_status" NOT NULL,
    "subscription_plan" "public"."subscription_plan" DEFAULT 'free'::"public"."subscription_plan" NOT NULL,
    "commission_rate_pct" numeric(5,2),
    "payout_provider" "text",
    "payout_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_listings" (
    "tenant_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_listings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_unique_listing_tenant" UNIQUE ("listing_id", "tenant_id");



ALTER TABLE ONLY "public"."listing_drafts"
    ADD CONSTRAINT "listing_drafts_pkey" PRIMARY KEY ("lister_id");



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_unique_angle" UNIQUE ("listing_id", "angle");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verification_codes"
    ADD CONSTRAINT "phone_verification_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_unique" UNIQUE ("phone");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_listings"
    ADD CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("tenant_id", "listing_id");



CREATE INDEX "idx_admin_audit_log_action" ON "public"."admin_audit_log" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_admin_audit_log_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_conversations_lister" ON "public"."conversations" USING "btree" ("lister_id", "last_message_at" DESC);



CREATE INDEX "idx_conversations_listing" ON "public"."conversations" USING "btree" ("listing_id");



CREATE INDEX "idx_conversations_tenant" ON "public"."conversations" USING "btree" ("tenant_id", "last_message_at" DESC);



CREATE INDEX "idx_listing_drafts_updated" ON "public"."listing_drafts" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_listing_photos_listing" ON "public"."listing_photos" USING "btree" ("listing_id", "created_at");



CREATE INDEX "idx_listings_amenities" ON "public"."listings" USING "gin" ("amenities");



CREATE INDEX "idx_listings_featured" ON "public"."listings" USING "btree" ("featured");



CREATE INDEX "idx_listings_lister" ON "public"."listings" USING "btree" ("lister_id");



CREATE INDEX "idx_listings_location" ON "public"."listings" USING "btree" ("region", "district", "ward");



CREATE INDEX "idx_listings_near_universities" ON "public"."listings" USING "gin" ("near_universities");



CREATE INDEX "idx_listings_price" ON "public"."listings" USING "btree" ("price_monthly");



CREATE INDEX "idx_listings_status_created_at" ON "public"."listings" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_messages_unseen" ON "public"."messages" USING "btree" ("conversation_id", "seen_at") WHERE ("seen_at" IS NULL);



CREATE INDEX "idx_phone_verification_codes_lookup" ON "public"."phone_verification_codes" USING "btree" ("user_id", "phone", "created_at" DESC);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_verification_status" ON "public"."profiles" USING "btree" ("verification_status");



CREATE INDEX "idx_saved_listings_saved_at" ON "public"."saved_listings" USING "btree" ("tenant_id", "saved_at" DESC);



CREATE OR REPLACE TRIGGER "set_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_listing_drafts_updated_at" BEFORE UPDATE ON "public"."listing_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_listing_photos_updated_at" BEFORE UPDATE ON "public"."listing_photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "touch_conversation_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_conversation_last_message"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_lister_id_fkey" FOREIGN KEY ("lister_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_drafts"
    ADD CONSTRAINT "listing_drafts_lister_id_fkey" FOREIGN KEY ("lister_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_lister_id_fkey" FOREIGN KEY ("lister_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_verification_codes"
    ADD CONSTRAINT "phone_verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_listings"
    ADD CONSTRAINT "saved_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_listings"
    ADD CONSTRAINT "saved_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_log_insert_admin" ON "public"."admin_audit_log" FOR INSERT WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("admin_id" = "auth"."uid"())));



CREATE POLICY "admin_audit_log_select_admin" ON "public"."admin_audit_log" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_delete_participants_or_admin" ON "public"."conversations" FOR DELETE USING ((("tenant_id" = "auth"."uid"()) OR ("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "conversations_insert_tenant_or_admin" ON "public"."conversations" FOR INSERT WITH CHECK (((("tenant_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "conversations"."listing_id") AND ("l"."lister_id" = "conversations"."lister_id"))))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "conversations_select_participants_or_admin" ON "public"."conversations" FOR SELECT USING ((("tenant_id" = "auth"."uid"()) OR ("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "conversations_update_participants_or_admin" ON "public"."conversations" FOR UPDATE USING ((("tenant_id" = "auth"."uid"()) OR ("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("tenant_id" = "auth"."uid"()) OR ("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."listing_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_drafts_delete_owner_or_admin" ON "public"."listing_drafts" FOR DELETE USING ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "listing_drafts_insert_owner_or_admin" ON "public"."listing_drafts" FOR INSERT WITH CHECK ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "listing_drafts_select_owner_or_admin" ON "public"."listing_drafts" FOR SELECT USING ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "listing_drafts_update_owner_or_admin" ON "public"."listing_drafts" FOR UPDATE USING ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."listing_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_photos_delete_owner_or_admin" ON "public"."listing_photos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND (("l"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "listing_photos_insert_owner_or_admin" ON "public"."listing_photos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND (("l"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "listing_photos_select_by_listing_visibility" ON "public"."listing_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND (("l"."status" = 'approved'::"public"."listing_status") OR ("l"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "listing_photos_update_owner_or_admin" ON "public"."listing_photos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND (("l"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND (("l"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listings_delete_owner_or_admin" ON "public"."listings" FOR DELETE USING ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "listings_insert_lister_or_admin" ON "public"."listings" FOR INSERT WITH CHECK ((("auth"."uid"() = "lister_id") AND ("public"."is_lister"("auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))));



CREATE POLICY "listings_select_by_visibility" ON "public"."listings" FOR SELECT USING ((("status" = 'approved'::"public"."listing_status") OR ("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "listings_update_owner_or_admin" ON "public"."listings" FOR UPDATE USING ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete_admin_only" ON "public"."messages" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "messages_insert_sender_participant_or_admin" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."tenant_id" = "auth"."uid"()) OR ("c"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))));



CREATE POLICY "messages_select_conversation_participants_or_admin" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."tenant_id" = "auth"."uid"()) OR ("c"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "messages_update_participants_or_admin" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."tenant_id" = "auth"."uid"()) OR ("c"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."tenant_id" = "auth"."uid"()) OR ("c"."lister_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "phone_codes_delete_owner_or_admin" ON "public"."phone_verification_codes" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "phone_codes_insert_owner_or_admin" ON "public"."phone_verification_codes" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "phone_codes_select_owner_or_admin" ON "public"."phone_verification_codes" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "phone_codes_update_owner_or_admin" ON "public"."phone_verification_codes" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."phone_verification_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_admin" ON "public"."profiles" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "profiles_insert_self_or_admin" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "profiles_public_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_self_or_admin" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("auth"."uid"() = "id") OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."saved_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_listings_delete_owner_or_admin" ON "public"."saved_listings" FOR DELETE USING ((("tenant_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "saved_listings_insert_owner_or_admin" ON "public"."saved_listings" FOR INSERT WITH CHECK ((("tenant_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "saved_listings_select_owner_or_admin" ON "public"."saved_listings" FOR SELECT USING ((("tenant_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_action_handler"("p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_action_handler"("p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_action_handler"("p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_phone_otps"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_phone_otps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_phone_otps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stale_listing_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stale_listing_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stale_listing_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_listing_view"("p_listing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_listing_view"("p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_listing_view"("p_listing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_lister"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_lister"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_lister"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_phone_otp"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_phone_otp"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_phone_otp"("p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_listing"("p_listing" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_listing"("p_listing" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_listing"("p_listing" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_phone_otp"("p_phone" "text", "p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_phone_otp"("p_phone" "text", "p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_phone_otp"("p_phone" "text", "p_code" "text") TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."listing_drafts" TO "anon";
GRANT ALL ON TABLE "public"."listing_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."listing_photos" TO "anon";
GRANT ALL ON TABLE "public"."listing_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_photos" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."phone_verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."phone_verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_verification_codes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saved_listings" TO "anon";
GRANT ALL ON TABLE "public"."saved_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_listings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







