-- Admin credential persistence & password reset
-- Adds columns to store_settings that hold the current admin demo email/password
-- so the admin gate can display them and autofill. These are updated by the
-- admin-auth edge function whenever the admin changes their credentials.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_password text;

-- Fix the store_settings.email reference so AdminGate logs in as an actual admin.
-- eqbalbaharase@gmail.com is a confirmed admin user (profile role = admin).
UPDATE public.store_settings
  SET email = 'eqbalbaharase@gmail.com',
      admin_email = 'eqbalbaharase@gmail.com',
      admin_password = 'admin123456'
WHERE id = 1;

-- Reset the active admin's password to admin123456 permanently.
-- crypt() with bf salt matches Supabase auth's encrypted_password format.
UPDATE auth.users
  SET encrypted_password = crypt('admin123456', gen_salt('bf')),
      email_change = '',
      email_change_token_new = '',
      recovery_token = '',
      updated_at = now()
WHERE email = 'eqbalbaharase@gmail.com';
