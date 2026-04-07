-- ============================================================
-- CampusStay TZ — Fix Admin RLS Policies
-- The previous policies checked (auth.jwt() ->> 'role') = 'admin'
-- which always evaluates to FALSE for normal users (JWT role is
-- 'authenticated', not 'admin').  We replace every broken admin
-- policy with one that uses the is_admin() helper that reads the
-- profiles table, and we also grant the admin full access to all
-- the tables it needs.
-- ============================================================

-- ─── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admin manages all profiles" ON public.profiles;

CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ensure users can still read and update their own row
DROP POLICY IF EXISTS "Users read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- ─── listings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all listings" ON public.listings;

CREATE POLICY "Admin manages all listings"
  ON public.listings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── listing_photos ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all listing_photos" ON public.listing_photos;

CREATE POLICY "Admin manages all listing_photos"
  ON public.listing_photos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── subscriptions ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all subscriptions" ON public.subscriptions;

CREATE POLICY "Admin manages all subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── activity_log ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all activity" ON public.activity_log;

CREATE POLICY "Admin reads all activity"
  ON public.activity_log FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── bookings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all bookings" ON public.bookings;
CREATE POLICY "Admin manages all bookings"
  ON public.bookings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── conversations ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all conversations" ON public.conversations;
CREATE POLICY "Admin manages all conversations"
  ON public.conversations FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── messages ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages all messages" ON public.messages;
CREATE POLICY "Admin manages all messages"
  ON public.messages FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Enable realtime for profiles (so admin user list updates live) ─
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
