-- Slot jadwal per capster (berhalangan / ditutup)
-- Kasir & admin bisa menutup slot operasional; capster bisa menutup slot miliknya.

create table if not exists capster_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  capster_id uuid not null references staff(id) on delete cascade,
  block_date date not null,
  block_time time not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (capster_id, block_date, block_time)
);

create index if not exists idx_capster_blocks_day
  on capster_blocks (business_id, capster_id, block_date);

alter table capster_blocks enable row level security;

drop policy if exists "Staff can view blocks in business" on capster_blocks;
create policy "Staff can view blocks in business" on capster_blocks
  for select using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff where user_id = auth.uid() and status = 'active'
    )
  );

-- Publik (pelanggan) perlu tahu slot tertutup saat booking
drop policy if exists "Public can view blocks" on capster_blocks;
create policy "Public can view blocks" on capster_blocks
  for select using (true);
