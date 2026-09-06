-- AntriKu Barber — role admin + integritas data
-- Jalankan di Supabase SQL Editor setelah migration 001–005.

-- 1) Batasi nilai staff.role menjadi admin | kasir | capster
--    Baris lama dengan role 'staff' dianggap kasir.
update staff set role = 'kasir' where role not in ('admin', 'kasir', 'capster');

alter table staff alter column role set default 'kasir';

alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role in ('admin', 'kasir', 'capster'));

alter table staff drop constraint if exists staff_status_check;
alter table staff add constraint staff_status_check
  check (status in ('active', 'inactive'));

-- 2) Batasi status booking agar tidak ada nilai liar
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in (
    'booked', 'checked_in', 'waiting', 'called', 'serving',
    'completed', 'skipped', 'cancelled'
  ));

alter table bookings drop constraint if exists bookings_source_check;
alter table bookings add constraint bookings_source_check
  check (source in ('online', 'walk_in'));

-- 3) FK customer_user_id supaya data pelanggan ikut terhapus rapi
alter table bookings drop constraint if exists bookings_customer_user_id_fkey;
alter table bookings add constraint bookings_customer_user_id_fkey
  foreign key (customer_user_id) references auth.users(id) on delete set null;

-- 4) Cegah dua booking pada capster + tanggal + jam yang sama
create unique index if not exists idx_bookings_capster_slot_unique
  on bookings (assigned_capster_id, booking_date, booking_time)
  where assigned_capster_id is not null
    and status not in ('cancelled', 'skipped');

-- 5) Kode booking harus unik
create unique index if not exists idx_bookings_code_unique on bookings (booking_code);

-- 6) Index bantu untuk query per capster & pelanggan
create index if not exists idx_bookings_capster_date
  on bookings (assigned_capster_id, booking_date);
create index if not exists idx_staff_business_role
  on staff (business_id, role, status);

-- 7) Owner tidak boleh terdaftar sebagai staff di bisnisnya sendiri
delete from staff s using businesses b
where s.business_id = b.id and s.user_id = b.owner_id;

-- 8) RLS: admin & kasir boleh menghapus booking di bisnisnya
drop policy if exists "Kasir can delete bookings in their business" on bookings;
drop policy if exists "Managers can delete bookings in their business" on bookings;
create policy "Managers can delete bookings in their business" on bookings
  for delete using (
    business_id in (
      select business_id from staff
      where user_id = auth.uid() and status = 'active' and role in ('admin', 'kasir')
    )
  );

-- 9) RLS: pelanggan boleh melihat booking miliknya sendiri
drop policy if exists "Customers can view own bookings" on bookings;
create policy "Customers can view own bookings" on bookings
  for select using (customer_user_id = auth.uid());

-- 10) RLS: admin boleh mengelola layanan
drop policy if exists "Admins can manage services" on services;
create policy "Admins can manage services" on services
  for all using (
    business_id in (
      select business_id from staff
      where user_id = auth.uid() and status = 'active' and role = 'admin'
    )
  );
