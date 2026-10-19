/*
# Announcement Bar Management + Backfill Missing store_settings Columns

## What this migration does

1. **NEW: Top Announcement Bar config** — Adds columns to `store_settings` so the
   admin can toggle the top promotional bar on/off and edit its text, link and
   color theme directly from the Admin Panel (Appearance tab):
   - `announcement_bar_enabled` (boolean, default true)
   - `announcement_bar_text`   (text, default 'Free shipping on orders over ৳5,000 · Flash sale live now')
   - `announcement_bar_link`   (text, nullable)
   - `announcement_bar_theme`  (text, default 'gold' — one of 'gold' | 'dark' | 'accent' | 'danger')

2. **Backfills previously missing columns** — The frontend already references
   these columns but several migrations on disk were never applied to this DB.
   All added with IF NOT EXISTS so re-running is safe:
   - `trxid` text
   - `district` text
   - `sms_api_key`, `sms_sender_id`, `sms_endpoint` text
   - `hero_overlay_opacity` int default 65
   - `hero_brightness` int default 100
   - `hero_parallax` boolean default true
   - `hero_badge`, `hero_secondary_cta`, `hero_secondary_link`, `hero_font` text
   - `default_theme` text default 'dark'
   - `theme_toggle_visible` boolean default true

3. **Rebuilds `store_settings_public` view** to include the announcement bar
   fields (and the wallet/courier/sms/hero fields already present on the base
   table) so the storefront can read the announcement bar config without
   exposing merchant secrets. The view inherits the base table's RLS policies.

## Security
- No new policies. The base table's existing `settings_read_public` (anon read)
  and `settings_admin_write` (admin CRUD) policies continue to govern both the
  table and the view.
- The public view intentionally excludes `gemini_api_key`, `card_secret_key`,
  `card_merchant_key`, all courier secrets, `sms_api_key`, `facebook_capi_token`
  and any other merchant secret.

## Notes
- Idempotent: every ALTER is wrapped in a DO $$ IF NOT EXISTS block; the view
  is dropped and recreated.
- No data is lost; all new columns are nullable or have safe defaults.
*/

DO $$ BEGIN
  -- Announcement bar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'announcement_bar_enabled') THEN
    ALTER TABLE store_settings ADD COLUMN announcement_bar_enabled boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'announcement_bar_text') THEN
    ALTER TABLE store_settings ADD COLUMN announcement_bar_text text NOT NULL DEFAULT 'Free shipping on orders over ৳5,000 · Flash sale live now';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'announcement_bar_link') THEN
    ALTER TABLE store_settings ADD COLUMN announcement_bar_link text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'announcement_bar_theme') THEN
    ALTER TABLE store_settings ADD COLUMN announcement_bar_theme text NOT NULL DEFAULT 'gold';
  END IF;

  -- Orders extras
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'trxid') THEN
    ALTER TABLE orders ADD COLUMN trxid text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'district') THEN
    ALTER TABLE orders ADD COLUMN district text;
  END IF;

  -- Hero display controls
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_overlay_opacity') THEN
    ALTER TABLE store_settings ADD COLUMN hero_overlay_opacity int NOT NULL DEFAULT 65;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_brightness') THEN
    ALTER TABLE store_settings ADD COLUMN hero_brightness int NOT NULL DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_parallax') THEN
    ALTER TABLE store_settings ADD COLUMN hero_parallax boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_badge') THEN
    ALTER TABLE store_settings ADD COLUMN hero_badge text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_secondary_cta') THEN
    ALTER TABLE store_settings ADD COLUMN hero_secondary_cta text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_secondary_link') THEN
    ALTER TABLE store_settings ADD COLUMN hero_secondary_link text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'hero_font') THEN
    ALTER TABLE store_settings ADD COLUMN hero_font text NOT NULL DEFAULT 'serif';
  END IF;

  -- Theme controls
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'default_theme') THEN
    ALTER TABLE store_settings ADD COLUMN default_theme text NOT NULL DEFAULT 'dark';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'theme_toggle_visible') THEN
    ALTER TABLE store_settings ADD COLUMN theme_toggle_visible boolean NOT NULL DEFAULT true;
  END IF;

  -- SMS provider config
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_api_key') THEN
    ALTER TABLE store_settings ADD COLUMN sms_api_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_sender_id') THEN
    ALTER TABLE store_settings ADD COLUMN sms_sender_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_endpoint') THEN
    ALTER TABLE store_settings ADD COLUMN sms_endpoint text;
  END IF;

  -- Courier columns referenced by frontend (safety net)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'rocket_number') THEN
    ALTER TABLE store_settings ADD COLUMN rocket_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'rocket_instructions') THEN
    ALTER TABLE store_settings ADD COLUMN rocket_instructions text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'card_gateway_name') THEN
    ALTER TABLE store_settings ADD COLUMN card_gateway_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'card_merchant_key') THEN
    ALTER TABLE store_settings ADD COLUMN card_merchant_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'card_secret_key') THEN
    ALTER TABLE store_settings ADD COLUMN card_secret_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'card_payment_url') THEN
    ALTER TABLE store_settings ADD COLUMN card_payment_url text;
  END IF;
END $$;

-- Recreate the public view with announcement bar fields + all safe storefront fields
DROP VIEW IF EXISTS store_settings_public;
CREATE VIEW store_settings_public AS
SELECT
  id, store_name, tagline, phone, email, address,
  facebook_url, instagram_url, tiktok_url, whatsapp_url,
  primary_color, secondary_color, accent_color, bg_color,
  button_depth, card_shadow, hover_zoom, border_radius,
  facebook_pixel_id, tiktok_pixel_id, gtm_id, ga4_id, clarity_id,
  card_enabled, cod_enabled, bdt_to_usd_rate,
  gemini_system_prompt, fraud_shield_enabled,
  bkash_number, nagad_number, rocket_number,
  bkash_instructions, nagad_instructions, rocket_instructions,
  card_instructions, cod_instructions, binance_instructions,
  binance_pay_id, usdt_wallet_address, binance_qr_url,
  card_gateway_name, card_payment_url,
  hero_banners, hero_overlay_opacity, hero_brightness, hero_parallax,
  hero_badge, hero_secondary_cta, hero_secondary_link, hero_font,
  default_theme, theme_toggle_visible,
  policy_return, policy_authentic, policy_shipping, policy_warranty, policy_support,
  default_courier,
  announcement_bar_enabled, announcement_bar_text, announcement_bar_link, announcement_bar_theme,
  updated_at
FROM store_settings;
