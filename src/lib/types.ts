export type BookingStatus =
  | 'booked'
  | 'checked_in'
  | 'waiting'
  | 'called'
  | 'serving'
  | 'completed'
  | 'skipped'
  | 'cancelled'

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  category: string
  address: string | null
  phone: string | null
  open_time: string
  close_time: string
  active_barbers: number
  status: string
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_start: number | null
  status: string
  created_at: string
}

export interface Booking {
  id: string
  business_id: string
  service_id: string | null
  booking_code: string
  customer_name: string
  customer_phone: string
  booking_date: string
  booking_time: string
  status: BookingStatus
  note: string | null
  source: 'online' | 'walk_in'
  called_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  service?: Service
  business?: Business
}

export interface BookingLog {
  id: string
  booking_id: string
  old_status: BookingStatus | null
  new_status: BookingStatus
  changed_by: string | null
  created_at: string
}

export interface TimeSlot {
  time: string
  available: boolean
  current_bookings: number
  max_capacity: number
}
