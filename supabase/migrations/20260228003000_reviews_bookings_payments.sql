begin;

do $$
begin
  create type public.booking_status as enum ('requested', 'approved', 'declined', 'cancelled', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'paid', 'late');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_listing_tenant unique (listing_id, tenant_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  lister_id uuid not null references public.profiles (id) on delete cascade,
  move_in_date date not null,
  duration_months integer not null check (duration_months between 1 and 24),
  message text,
  contact_preference text,
  status public.booking_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount integer not null check (amount > 0),
  due_date date not null,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reviews_listing_created on public.reviews (listing_id, created_at desc);
create index if not exists idx_reviews_tenant on public.reviews (tenant_id, created_at desc);
create index if not exists idx_bookings_listing_status on public.bookings (listing_id, status, created_at desc);
create index if not exists idx_bookings_tenant on public.bookings (tenant_id, created_at desc);
create index if not exists idx_bookings_lister on public.bookings (lister_id, created_at desc);
create index if not exists idx_payment_records_booking_due on public.payment_records (booking_id, due_date);
create index if not exists idx_payment_records_status_due on public.payment_records (status, due_date);

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_records_updated_at on public.payment_records;
create trigger set_payment_records_updated_at
before update on public.payment_records
for each row execute function public.set_updated_at();

create or replace function public.generate_payment_records_on_booking_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  monthly_amount integer;
  month_index integer;
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    if not exists (select 1 from public.payment_records where booking_id = new.id) then
      select l.price_monthly
        into monthly_amount
      from public.listings l
      where l.id = new.listing_id;

      if monthly_amount is not null and monthly_amount > 0 then
        for month_index in 0..greatest(new.duration_months, 1) - 1 loop
          insert into public.payment_records (booking_id, amount, due_date, status)
          values (
            new.id,
            monthly_amount,
            (new.move_in_date + make_interval(months => month_index))::date,
            'pending'
          );
        end loop;
      end if;
    end if;

    update public.listings
    set vacancy_status = 'occupied',
        updated_at = now()
    where id = new.listing_id
      and vacancy_status <> 'occupied';
  end if;

  return new;
end;
$$;

drop trigger if exists generate_payment_records_on_booking_approval on public.bookings;
create trigger generate_payment_records_on_booking_approval
after update of status on public.bookings
for each row execute function public.generate_payment_records_on_booking_approval();

alter table public.reviews enable row level security;
alter table public.bookings enable row level security;
alter table public.payment_records enable row level security;

drop policy if exists "reviews_select_public_approved_not_hidden" on public.reviews;
create policy "reviews_select_public_approved_not_hidden"
on public.reviews
for select
to anon, authenticated
using (
  is_hidden = false
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.status = 'approved'
  )
);

drop policy if exists "reviews_insert_tenant_or_admin" on public.reviews;
create policy "reviews_insert_tenant_or_admin"
on public.reviews
for insert
to authenticated
with check (
  (
    auth.uid() = tenant_id
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.status = 'approved'
    )
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "reviews_update_owner_or_admin" on public.reviews;
create policy "reviews_update_owner_or_admin"
on public.reviews
for update
to authenticated
using (
  auth.uid() = tenant_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = tenant_id
  or public.is_admin(auth.uid())
);

drop policy if exists "reviews_delete_admin_only" on public.reviews;
create policy "reviews_delete_admin_only"
on public.reviews
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "bookings_select_participants_or_admin" on public.bookings;
create policy "bookings_select_participants_or_admin"
on public.bookings
for select
to authenticated
using (
  auth.uid() = tenant_id
  or auth.uid() = lister_id
  or public.is_admin(auth.uid())
);

drop policy if exists "bookings_insert_tenant_or_admin" on public.bookings;
create policy "bookings_insert_tenant_or_admin"
on public.bookings
for insert
to authenticated
with check (
  (
    auth.uid() = tenant_id
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.lister_id = bookings.lister_id
        and l.status = 'approved'
    )
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "bookings_update_participants_or_admin" on public.bookings;
create policy "bookings_update_participants_or_admin"
on public.bookings
for update
to authenticated
using (
  auth.uid() = tenant_id
  or auth.uid() = lister_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = tenant_id
  or auth.uid() = lister_id
  or public.is_admin(auth.uid())
);

drop policy if exists "bookings_delete_admin_only" on public.bookings;
create policy "bookings_delete_admin_only"
on public.bookings
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "payment_records_select_participants_or_admin" on public.payment_records;
create policy "payment_records_select_participants_or_admin"
on public.payment_records
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.tenant_id = auth.uid() or b.lister_id = auth.uid())
  )
);

drop policy if exists "payment_records_insert_lister_or_admin" on public.payment_records;
create policy "payment_records_insert_lister_or_admin"
on public.payment_records
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.lister_id = auth.uid()
  )
);

drop policy if exists "payment_records_update_participants_or_admin" on public.payment_records;
create policy "payment_records_update_participants_or_admin"
on public.payment_records
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.tenant_id = auth.uid() or b.lister_id = auth.uid())
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.tenant_id = auth.uid() or b.lister_id = auth.uid())
  )
);

drop policy if exists "payment_records_delete_admin_only" on public.payment_records;
create policy "payment_records_delete_admin_only"
on public.payment_records
for delete
to authenticated
using (public.is_admin(auth.uid()));

commit;
