-- 20260517000002_fix_chat_rpc_real_id.sql
-- Fix the RPC to dynamically resolve the landlord's true Auth ID if a landlords.id is provided by the frontend view

CREATE OR REPLACE FUNCTION public.start_conversation(p_listing_id uuid, p_tenant_id uuid, p_landlord_id uuid)
RETURNS json AS $$
DECLARE
  v_conv_id uuid;
  v_real_landlord_id uuid;
BEGIN
  -- Resolve the true auth.users ID for the landlord
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_landlord_id) THEN
    v_real_landlord_id := p_landlord_id;
  ELSE
    -- Try to resolve from the landlords table (if frontend passed landlords.id)
    SELECT profile_id INTO v_real_landlord_id FROM public.landlords WHERE id = p_landlord_id;
    
    -- If still missing, resolve from the listing itself
    IF v_real_landlord_id IS NULL THEN
      SELECT l.profile_id INTO v_real_landlord_id 
      FROM public.rooms r
      JOIN public.properties p ON r.property_id = p.id
      JOIN public.landlords l ON p.landlord_id = l.id
      WHERE r.id = p_listing_id;
    END IF;
  END IF;

  -- Fallback to the original if resolution failed
  IF v_real_landlord_id IS NULL THEN
    v_real_landlord_id := p_landlord_id;
  END IF;

  -- Ensure tenant profile exists
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (p_tenant_id, 'Tenant', 'tenant')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure landlord profile exists
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (v_real_landlord_id, 'Property Owner', 'landlord')
  ON CONFLICT (id) DO NOTHING;

  -- Check if conversation already exists
  SELECT id INTO v_conv_id FROM public.conversations 
  WHERE listing_id = p_listing_id AND tenant_id = p_tenant_id AND landlord_id = v_real_landlord_id
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (listing_id, tenant_id, landlord_id, inquiry_status)
    VALUES (p_listing_id, p_tenant_id, v_real_landlord_id, 'open')
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN json_build_object('conversation_id', v_conv_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
