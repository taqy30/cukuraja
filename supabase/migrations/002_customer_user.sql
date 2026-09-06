-- Link bookings to logged-in customers
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_user ON bookings(customer_user_id);
