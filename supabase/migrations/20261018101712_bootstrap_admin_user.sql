/*
# Bootstrap admin user

Creates the default admin account for the DHONG GHAR store so the admin panel
is accessible immediately.

- Email: admin@dhongghar.com
- Password: Admin@2025
- Role: admin (stored in raw_app_meta_data so is_admin() returns true)
*/

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token,
  recovery_token, email_change_token_new, email_change, phone, phone_confirmed_at,
  banned_until
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'admin@dhongghar.com',
  crypt('Admin@2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role":"admin"}'::jsonb,
  '{"full_name":"Store Admin","role":"admin"}'::jsonb,
  '',
  '',
  '',
  '',
  null,
  null,
  null
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@dhongghar.com');

INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT 'a1111111-1111-1111-1111-111111111111', 'admin@dhongghar.com', 'Store Admin', null, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@dhongghar.com');
