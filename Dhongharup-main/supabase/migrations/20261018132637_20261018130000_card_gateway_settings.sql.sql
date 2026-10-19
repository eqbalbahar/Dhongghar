/*
# Card Payment Gateway Settings

## What this migration does
Adds four columns to `store_settings` for configuring a card payment gateway
(SSLCommerz, Shurjopay, Stripe, or a custom processor). The checkout card form
reads these to either render an inline card-entry form or redirect to the gateway.

## New columns on store_settings
- `card_gateway_name` (text) — e.g. "SSLCommerz", "Shurjopay", "Stripe", "Custom".
- `card_merchant_key` (text) — merchant/store ID or publishable key.
- `card_secret_key` (text) — secret API key (server-side, never exposed to storefront).
- `card_payment_url` (text) — gateway payment/checkout URL for redirect flow.

## Notes
1. Existing RLS policies on store_settings cover the new columns automatically.
2. Idempotent — uses ADD COLUMN IF NOT EXISTS.
*/

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS card_gateway_name text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS card_merchant_key text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS card_secret_key text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS card_payment_url text;