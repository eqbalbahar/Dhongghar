/*
# Fix store_settings_public view + add hero banner enrichment columns

## What this does
1. Recreates the `store_settings_public` view to include `bkash_number` and `nagad_number`.
   These columns existed on the base table but were missing from the public view, so the
   checkout page could read the Rocket wallet number but never the bKash or Nagad ones —
   causing the "contact us for the number" fallback text to appear for bKash/Nagad.
2. Adds new columns to `store_settings` for the hero banner typography manager:
   - `hero_badge` — small badge text above the hero headline
   - `hero_secondary_cta` — label for the secondary button
   - `hero_secondary_link` — URL for the secondary button
   - `hero_font` — font family selector for the hero section
3. No RLS changes — the view inherits the base table's policies.

## Notes
- The view is dropped and recreated (CREATE OR REPLACE cannot add columns reliably).
- All new columns are nullable so existing rows are unaffected.
*/

-- Add hero banner enrichment columns if they don't exist
DO $$ BEGIN
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
    ALTER TABLE store_settings ADD COLUMN hero_font text DEFAULT 'serif';
  END IF;
END $$;

-- Recreate the public view with bkash_number and nagad_number included
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
  default_courier, updated_at
FROM store_settings;
