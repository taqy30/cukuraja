-- AntriKu Barber - Initial Schema

-- Businesses table
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  category text default 'barber',
  address text,
  phone text,
  open_time time not null default '10:00',
  close_time time not null default '21:00',
  active_barbers int default 1,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Services table
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 30,
  price_start numeric,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Bookings table
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  booking_code text not null,
  customer_name text not null,
  customer_phone text not null,
  booking_date date not null,
  booking_time time not null,
  status text default 'booked',
  source text default 'online',
  note text,
  called_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Booking logs table
create table if not exists booking_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid,
  created_at timestamp with time zone default now()
);

-- Staff table (links auth users to businesses)
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  role text default 'staff',
  name text not null,
  status text default 'active',
  created_at timestamp with time zone default now(),
  unique(user_id, business_id)
);

-- Indexes
create index if not exists idx_bookings_business_date on bookings(business_id, booking_date);
create index if not exists idx_bookings_code on bookings(booking_code);
create index if not exists idx_services_business on services(business_id);
create index if not exists idx_staff_user on staff(user_id);
create index if not exists idx_staff_business on staff(business_id);

-- Row Level Security
alter table businesses enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table booking_logs enable row level security;
alter table staff enable row level security;

-- Policies for businesses
create policy "Public can view active businesses" on businesses
  for select using (status = 'active');

create policy "Owners can manage their business" on businesses
  for all using (auth.uid() = owner_id);

-- Policies for services
create policy "Public can view active services" on services
  for select using (status = 'active');

create policy "Owners can manage services" on services
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Policies for bookings
create policy "Anyone can create bookings" on bookings
  for insert with check (true);

create policy "Public can view own booking by code" on bookings
  for select using (true);

create policy "Staff and owners can manage bookings" on bookings
  for update using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff where user_id = auth.uid()
    )
  );

-- Policies for booking_logs
create policy "Staff and owners can view logs" on booking_logs
  for select using (
    booking_id in (
      select b.id from bookings b
      where b.business_id in (
        select id from businesses where owner_id = auth.uid()
        union
        select business_id from staff where user_id = auth.uid()
      )
    )
  );

create policy "System can insert logs" on booking_logs
  for insert with check (true);

-- Policies for staff
create policy "Owners can manage staff" on staff
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "Staff can view own record" on staff
  for select using (user_id = auth.uid());
