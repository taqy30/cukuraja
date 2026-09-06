-- Assign booking to specific capster (staff row)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS assigned_capster_id uuid REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_capster ON bookings(assigned_capster_id);
