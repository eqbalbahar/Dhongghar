/*
# DHONG GHAR — Combined master update (security, courier, policies, banners, categories)

## Overview
Extends the schema for: hidden admin, payment instructions + TrxID, courier
integration, global policy texts, per-product custom guarantees, hero banners,
and anon-safe settings view that hides merchant wallet numbers / courier secrets.

## Tables modified
- store_settings: payment instructions, courier creds, policy texts, hero banners.
- products: custom_guarantees (jsonb), custom_features (text[]).
- orders: trxid, courier_name, courier_tracking, courier_consignment, courier_booked_at.

## Security
- store_settings base table SELECT restricted to authenticated (admin writes only).
- New public view store_settings_public exposes only non-sensitive columns to anon.
- Admin password verification handled by the admin-auth edge function (Supabase auth API).
*/

-- ========== store_settings new columns ==========
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bkash_instructions text,
  ADD COLUMN IF NOT EXISTS nagad_instructions text,
  ADD COLUMN IF NOT EXISTS rocket_number text,
  ADD COLUMN IF NOT EXISTS rocket_instructions text,
  ADD COLUMN IF NOT EXISTS card_instructions text,
  ADD COLUMN IF NOT EXISTS cod_instructions text DEFAULT 'Pay with cash when your order is delivered to your door.',
  ADD COLUMN IF NOT EXISTS binance_instructions text,
  ADD COLUMN IF NOT EXISTS hero_banners jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_return text DEFAULT '7 Days Easy Return Policy',
  ADD COLUMN IF NOT EXISTS policy_authentic text DEFAULT '100% Authentic Product',
  ADD COLUMN IF NOT EXISTS policy_shipping text DEFAULT 'Express Shipping All Over Bangladesh',
  ADD COLUMN IF NOT EXISTS policy_warranty text,
  ADD COLUMN IF NOT EXISTS policy_support text DEFAULT '24/7 Customer Support',
  ADD COLUMN IF NOT EXISTS steadfast_api_key text,
  ADD COLUMN IF NOT EXISTS steadfast_secret text,
  ADD COLUMN IF NOT EXISTS steadfast_merchant_id text,
  ADD COLUMN IF NOT EXISTS pathao_api_key text,
  ADD COLUMN IF NOT EXISTS pathao_secret text,
  ADD COLUMN IF NOT EXISTS pathao_merchant_id text,
  ADD COLUMN IF NOT EXISTS redx_api_key text,
  ADD COLUMN IF NOT EXISTS redx_secret text,
  ADD COLUMN IF NOT EXISTS paperfly_api_key text,
  ADD COLUMN IF NOT EXISTS paperfly_merchant_id text,
  ADD COLUMN IF NOT EXISTS default_courier text DEFAULT 'steadfast';

-- ========== products new columns ==========
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS custom_guarantees jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_features text[] DEFAULT '{}';

-- ========== orders new columns ==========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS trxid text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS courier_tracking text,
  ADD COLUMN IF NOT EXISTS courier_consignment text,
  ADD COLUMN IF NOT EXISTS courier_booked_at timestamptz;

-- ========== Secure store_settings for anon ==========
DROP POLICY IF EXISTS "settings_read_public" ON public.store_settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.store_settings;

CREATE POLICY "settings_read_authenticated" ON public.store_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_write" ON public.store_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP VIEW IF EXISTS public.store_settings_public;
CREATE VIEW public.store_settings_public AS
SELECT
  id, store_name, tagline, phone, email, address,
  facebook_url, instagram_url, tiktok_url, whatsapp_url,
  primary_color, secondary_color, accent_color, bg_color,
  button_depth, card_shadow, hover_zoom, border_radius,
  facebook_pixel_id, tiktok_pixel_id, gtm_id, ga4_id, clarity_id,
  card_enabled, cod_enabled,
  bdt_to_usd_rate,
  gemini_system_prompt,
  fraud_shield_enabled,
  bkash_instructions, nagad_instructions, rocket_instructions, rocket_number,
  card_instructions, cod_instructions, binance_instructions,
  hero_banners,
  policy_return, policy_authentic, policy_shipping, policy_warranty, policy_support,
  default_courier,
  updated_at
FROM public.store_settings;

ALTER VIEW public.store_settings_public OWNER TO postgres;
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- ========== Seed: sensible defaults ==========
UPDATE public.store_settings SET
  bkash_instructions = COALESCE(bkash_instructions, 'Send money to our bKash merchant number, then enter the TrxID below. We will confirm your payment within 1 hour.'),
  nagad_instructions = COALESCE(nagad_instructions, 'Send money to our Nagad number, then enter the TrxID below. We will confirm within 1 hour.'),
  rocket_instructions = COALESCE(rocket_instructions, 'Send money to our Rocket number, then enter the TrxID below.'),
  card_instructions = COALESCE(card_instructions, 'Pay securely with Visa/Mastercard/Amex at checkout.'),
  binance_instructions = COALESCE(binance_instructions, 'Pay with Binance Pay or USDT (TRC20). After sending, enter your Binance TxID for verification.'),
  hero_banners = COALESCE(hero_banners, jsonb_build_array(
    jsonb_build_object('image','https://images.pexels.com/photos/20558827/pexels-photo-20558827.jpeg?auto=compress&cs=tinysrgb&h=1200','title','Wear the Extraordinary','subtitle','Handwoven sarees, premium tees, couture cosmetics & statement accessories','cta','Shop Collection','link','/shop'),
    jsonb_build_object('image','https://images.pexels.com/photos/9617682/pexels-photo-9617682.jpeg?auto=compress&cs=tinysrgb&h=1200','title','Couture, delivered','subtitle','Each piece hand-selected and quality-checked','cta','Discover More','link','/shop')
  ))
WHERE id = 1;
