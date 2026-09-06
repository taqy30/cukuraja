-- AntriKu — perbaikan koneksi role & RLS untuk admin/kasir/pelanggan
-- Aman dijalankan ulang (idempotent).

-- 1) Pastikan role staff valid
update staff set role = 'kasir' where role not in ('admin', 'kasir', 'capster');

alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check
  check (role in ('admin', 'kasir', 'capster'));

-- 2) Staff aktif boleh membaca bisnisnya (diperlukan join di beberapa query)
drop policy if exists "Staff can view their business" on businesses;
create policy "Staff can view their business" on businesses
  for select using (
    id in (
      select business_id from staff
      where user_id = auth.uid() and status = 'active'
    )
  );

-- 3) Pelanggan melihat booking miliknya (tambahan eksplisit)
drop policy if exists "Customers can view own bookings" on bookings;
create policy "Customers can view own bookings" on bookings
  for select using (customer_user_id = auth.uid());

-- 4) Index bantu customer dashboard
create index if not exists idx_bookings_customer_user_date
  on bookings (customer_user_id, booking_date desc);
