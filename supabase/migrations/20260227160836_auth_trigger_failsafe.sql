create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));
  resolved_role public.app_role := case
    when requested_role in ('admin') then 'admin'::public.app_role
    when requested_role in ('lister', 'landlord') then 'lister'::public.app_role
    else 'student'::public.app_role
  end;
  requested_lister_type text := lower(coalesce(new.raw_user_meta_data ->> 'lister_type', ''));
  resolved_lister_type public.lister_type := case
    when requested_lister_type = 'owner' then 'owner'::public.lister_type
    when requested_lister_type = 'manager' then 'manager'::public.lister_type
    when requested_lister_type = 'dalali' then 'dalali'::public.lister_type
    else null
  end;
begin
  begin
    insert into public.profiles (
      id,
      role,
      lister_type,
      full_name,
      phone,
      verification_status,
      created_at,
      updated_at
    )
    values (
      new.id,
      resolved_role,
      resolved_lister_type,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'New User'),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      case when resolved_role = 'lister' then 'pending' else 'unverified' end,
      now(),
      now()
    )
    on conflict (id) do nothing;
  exception
    when others then
      -- Fail-safe: never block auth user creation if profile bootstrap fails.
      raise warning 'handle_new_auth_user failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
