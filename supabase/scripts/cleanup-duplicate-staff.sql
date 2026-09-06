-- Opsional: hapus staff duplikat / owner ikut masuk staff
-- Jalankan di Supabase SQL Editor SETELAH backup atau di project dev saja

-- 1) Pastikan owner@gmail.com punya bisnis (ganti email jika beda)
-- Cek dulu:
-- SELECT u.id, u.email, b.id AS business_id, b.slug
-- FROM auth.users u
-- LEFT JOIN businesses b ON b.owner_id = u.id
-- WHERE u.email = 'owner@gmail.com';

-- 2) Hapus baris staff yang user-nya adalah OWNER bisnis (owner tidak boleh di staff)
DELETE FROM staff s
USING businesses b
WHERE s.business_id = b.id
  AND s.user_id = b.owner_id;

-- 3) Hapus staff duplikat (simpan yang paling lama per user_id + business_id)
DELETE FROM staff a
USING staff b
WHERE a.business_id = b.business_id
  AND a.user_id = b.user_id
  AND a.created_at > b.created_at;
