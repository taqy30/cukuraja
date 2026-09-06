-- Membership pelanggan per bisnis (multi-tenant, tanpa listUsers lintas tenant)

create table if not exists business_customers (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists idx_business_customers_user
  on business_customers (user_id);

alter table business_customers enable row level security;

drop policy if exists "Owners and staff can view business customers" on business_customers;
create policy "Owners and staff can view business customers" on business_customers
  for select using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Owners can manage business customers" on business_customers;
create policy "Owners can manage business customers" on business_customers
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
