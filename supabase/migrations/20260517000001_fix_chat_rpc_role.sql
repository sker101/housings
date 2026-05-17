-- 20260517000001_fix_chat_rpc_role.sql
-- Fix the role used when auto-creating profiles to match the profiles_role_check constraint

CREATE OR REPLACE FUNCTION public.start_conversation(p_listing_id uuid, p_tenant_id uuid, p_landlord_id uuid)
RETURNS json AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Ensure tenant profile exists (must be 'tenant', not 'student')
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (p_tenant_id, 'Tenant', 'tenant')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure landlord profile exists (must be 'landlord')
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (p_landlord_id, 'Property Owner', 'landlord')
  ON CONFLICT (id) DO NOTHING;

  -- Check if conversation already exists
  SELECT id INTO v_conv_id FROM public.conversations 
  WHERE listing_id = p_listing_id AND tenant_id = p_tenant_id AND landlord_id = p_landlord_id
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (listing_id, tenant_id, landlord_id, inquiry_status)
    VALUES (p_listing_id, p_tenant_id, p_landlord_id, 'open')
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN json_build_object('conversation_id', v_conv_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
