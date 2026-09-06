-- Staff (kasir/capster) boleh melihat rekan di barbershop yang sama
-- Tanpa ini, kasir hanya melihat 1 baris staff (diri sendiri) dan capster lain tidak muncul
CREATE POLICY "Staff can view colleagues in same business"
  ON staff FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
