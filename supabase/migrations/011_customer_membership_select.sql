-- Pelanggan boleh membaca membership miliknya sendiri (multi-tenant dashboard).

drop policy if exists "Customers can view own memberships" on business_customers;
create policy "Customers can view own memberships" on business_customers
  for select using (user_id = auth.uid());
