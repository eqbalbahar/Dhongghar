/*
# Luxury Rebrand — Premium Category Imagery, Hero Banners & Demo Admin

## What this migration does

1. **Demo admin account** — Sets the admin email to eqbalbaharase@gmail.com with
   password demo123456 (bcrypt-hashed). The email is also mirrored in
   store_settings.email so the AdminGate password screen resolves the correct
   user. The password can be changed later from the Admin Panel → Admin Security
   tab or by updating auth.users directly.
2. **Premium category imagery** — Updates image_url on the 3 main categories
   (Women's Fashion, Men's Fashion, Cosmetics & Lifestyle) with high-resolution
   luxury editorial photography, and adds images to all 15 sub-categories so
   every category page shows an on-topic, premium hero.
3. **Luxury hero banners** — Replaces the default hero_banners array with three
   curated luxury editorial banners (Saree, Men's Couture, Cosmetics & Lifestyle)
   each with title, subtitle, CTA and link.
4. **Store contact** — Updates store_settings contact email to the demo admin
   email for consistency.

## Tables modified
- auth.users — upsert demo admin row with role admin
- public.profiles — upsert matching profile row
- public.categories — set image_url on all 18 categories
- public.store_settings — update email + hero_banners

## Security
- No policy or RLS changes. Existing admin policies cover the demo account.

## Notes
1. Idempotent — uses WHERE NOT EXISTS / ON CONFLICT for inserts.
2. To reset the password later: run
   UPDATE auth.users SET encrypted_password = crypt('NEW_PASSWORD', gen_salt('bf'))
   WHERE email = 'eqbalbaharase@gmail.com';
*/

-- ========== Demo admin account ==========
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token,
  recovery_token, email_change_token_new, email_change, phone, phone_confirmed_at,
  banned_until
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'eqbalbaharase@gmail.com',
  crypt('demo123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role":"admin"}'::jsonb,
  '{"full_name":"Eqbal Baharase","role":"admin"}'::jsonb,
  '', '', '', '', null, null, null
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'eqbalbaharase@gmail.com');

UPDATE auth.users
SET encrypted_password = crypt('demo123456', gen_salt('bf')),
    raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"'),
    raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Eqbal Baharase"')
WHERE email = 'eqbalbaharase@gmail.com';

INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT 'b2222222-2222-2222-2222-222222222222', 'eqbalbaharase@gmail.com', 'Eqbal Baharase', null, 'admin'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, role = 'admin', full_name = EXCLUDED.full_name;

UPDATE public.store_settings
SET email = 'eqbalbaharase@gmail.com'
WHERE id = 1;

-- ========== Premium category imagery ==========
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/35108811/pexels-photo-35108811.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'womens-fashion';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/13532890/pexels-photo-13532890.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'mens-fashion';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/29899579/pexels-photo-29899579.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'cosmetics-lifestyle';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/6842791/pexels-photo-6842791.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'saree';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/35108809/pexels-photo-35108809.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'three-piece';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/17503287/pexels-photo-17503287.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'lingerie-innerwear';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/7304331/pexels-photo-7304331.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'salwar-kameez';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/14467787/pexels-photo-14467787.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'tops';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/7956933/pexels-photo-7956933.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'panjabi';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/17223721/pexels-photo-17223721.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 't-shirt';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/6765639/pexels-photo-6765639.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'lungi';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/13532890/pexels-photo-13532890.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'shirt';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/6764922/pexels-photo-6764922.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'jeans';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/4938196/pexels-photo-4938196.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'makeup';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/16233812/pexels-photo-16233812.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'skincare';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/3656125/pexels-photo-3656125.jpeg?auto=compress&cs=tinysrgb&h=900'  WHERE slug = 'watches-clocks';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/11980639/pexels-photo-11980639.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'bags-purses';
UPDATE public.categories SET image_url = 'https://images.pexels.com/photos/36189601/pexels-photo-36189601.jpeg?auto=compress&cs=tinysrgb&h=900' WHERE slug = 'jewelry-accessories';

-- ========== Luxury hero banners ==========
UPDATE public.store_settings
SET hero_banners = jsonb_build_array(
  jsonb_build_object(
    'image','https://images.pexels.com/photos/35108811/pexels-photo-35108811.jpeg?auto=compress&cs=tinysrgb&h=1400',
    'title','Wear the Extraordinary',
    'subtitle','Handwoven silk sarees, premium tees, couture cosmetics & statement accessories — curated for the modern connoisseur.',
    'cta','Shop Collection',
    'link','/shop'
  ),
  jsonb_build_object(
    'image','https://images.pexels.com/photos/13532890/pexels-photo-13532890.jpeg?auto=compress&cs=tinysrgb&h=1400',
    'title','Couture, Tailored',
    'subtitle','Bespoke menswear crafted from the world''s finest fabrics — engineered for the gentleman who notices the details.',
    'cta','Explore Menswear',
    'link','/shop?category=mens-fashion'
  ),
  jsonb_build_object(
    'image','https://images.pexels.com/photos/29899579/pexels-photo-29899579.jpeg?auto=compress&cs=tinysrgb&h=1400',
    'title','Beauty, Distilled',
    'subtitle','Luxury cosmetics, skincare and timepieces — the finishing touches to a life well-lived.',
    'cta','Discover Lifestyle',
    'link','/shop?category=cosmetics-lifestyle'
  )
)
WHERE id = 1;
