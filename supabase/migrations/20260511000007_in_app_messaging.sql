-- ─────────────────────────────────────────────────────────────────────────────
-- Native In-App Messaging Schema
-- Migration: 20260511000007_in_app_messaging.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the legacy views to make room for real tables
DROP VIEW IF EXISTS public.messages CASCADE;
DROP VIEW IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id  uuid REFERENCES rooms(id) ON DELETE SET NULL,
  inquiry_status text DEFAULT 'open',
  move_in_date   date,
  last_message_at timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, landlord_id, listing_id)
);

CREATE TABLE public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            text NOT NULL,
  is_read         boolean DEFAULT false,
  seen_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Participants can view conversations') THEN
    CREATE POLICY "Participants can view conversations" ON conversations
      FOR SELECT USING (auth.uid() IN (tenant_id, landlord_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Participants can create conversations') THEN
    CREATE POLICY "Participants can create conversations" ON conversations
      FOR INSERT WITH CHECK (auth.uid() IN (tenant_id, landlord_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Participants can update conversations') THEN
    CREATE POLICY "Participants can update conversations" ON conversations
      FOR UPDATE USING (auth.uid() IN (tenant_id, landlord_id));
  END IF;
END $$;

-- Messages RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Participants can view messages') THEN
    CREATE POLICY "Participants can view messages" ON messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM conversations c 
          WHERE c.id = messages.conversation_id 
          AND auth.uid() IN (c.tenant_id, c.landlord_id)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Participants can send messages') THEN
    CREATE POLICY "Participants can send messages" ON messages
      FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (
          SELECT 1 FROM conversations c 
          WHERE c.id = messages.conversation_id 
          AND auth.uid() IN (c.tenant_id, c.landlord_id)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Participants can update read status') THEN
    CREATE POLICY "Participants can update read status" ON messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM conversations c 
          WHERE c.id = messages.conversation_id 
          AND auth.uid() IN (c.tenant_id, c.landlord_id)
        )
      );
  END IF;
END $$;

-- Enable Realtime for messages and conversations tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Trigger to update 'last_message_at' on conversations when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message_at();

