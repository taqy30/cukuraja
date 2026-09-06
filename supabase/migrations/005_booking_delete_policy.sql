-- Owner & kasir boleh hapus booking (staff/capster tidak)
CREATE POLICY "Owners can delete bookings"
  ON bookings FOR DELETE
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Kasir can delete bookings in their business"
  ON bookings FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'kasir'
    )
  );
