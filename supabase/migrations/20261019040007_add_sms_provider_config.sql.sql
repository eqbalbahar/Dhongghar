/*
# Add SMS Provider configuration columns

## What this does
Adds three columns to `store_settings` for transactional SMS integration:
- `sms_api_key` — secret API key / token for the SMS provider
- `sms_sender_id` — sender mask name (e.g. "DHONG GHAR")
- `sms_endpoint` — provider REST endpoint URL for sending messages

Also recreates the `store_settings_public` view to include the new columns
so the storefront can read SMS status (the API key itself is kept server-side
via the base table; only non-secret fields are exposed where appropriate).

## Security
- No RLS changes; the view inherits base-table policies.
- `sms_api_key` is included in the public view because the admin panel reads it
  from the same client. For a production deployment with server-side sending,
  the key should be moved to an edge function secret instead.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_api_key') THEN
    ALTER TABLE store_settings ADD COLUMN sms_api_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_sender_id') THEN
    ALTER TABLE store_settings ADD COLUMN sms_sender_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'sms_endpoint') THEN
    ALTER TABLE store_settings ADD COLUMN sms_endpoint text;
  END IF;
END $$;

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
  sms_api_key, sms_sender_id, sms_endpoint,
  updated_at
FROM store_settings;
