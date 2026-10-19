/*
# DHONG GHAR — core e-commerce schema

## Overview
Creates the full data model for a luxury e-commerce platform with admin/customer
role separation, product catalog with variants, orders, coupons, reviews, store
settings (brand, theme, pixels, payment, AI), and fraud shield blacklists.

## New Tables
- `profiles` — extends auth.users with role (admin/customer), phone, full_name
- `categories` — product categories (Saree, T-Shirt, Cosmetics, Accessories)
- `products` — catalog items with price_bdt, compare_at_bdt, stock, images, status
- `product_variants` — size/color swatches per product with own stock
- `reviews` — customer reviews with star rating + optional photo url
- `orders` — header: customer info, totals, status, payment method, txid
- `order_items` — line items per order
- `coupons` — promo codes with type/value/limits/expiry
- `coupon_usages` — tracks per-order coupon usage
- `store_settings` — singleton row with contact, social, theme, pixels, payment, AI config
- `fraud_blacklist` — blacklisted ips/phones

## Security
- RLS enabled on every table.
- products/categories/coupons/reviews/store_settings: public read (TO anon, authenticated).
- orders + order_items: customer reads own (user_id match); admin reads all.
- profiles: self read/update.
- Admin-only writes enforced via is_admin() helper checking app_metadata.role = 'admin'.
- fraud_blacklist: admin-only CRUD.
*/

-- ---------- helper: is_admin ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'customer',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ---------- categories ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_public" ON public.categories;
CREATE POLICY "categories_read_public" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_bdt numeric(10,2) NOT NULL DEFAULT 0,
  compare_at_bdt numeric(10,2),
  cost_bdt numeric(10,2) DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 5,
  sku text,
  images text[] NOT NULL DEFAULT '{}',
  colors text[] DEFAULT '{}',
  sizes text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  is_flash_sale boolean DEFAULT false,
  flash_sale_ends_at timestamptz,
  rating_avg numeric(2,1) DEFAULT 0,
  rating_count int DEFAULT 0,
  sales_count int DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_public" ON public.products;
CREATE POLICY "products_read_public" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_flash_idx ON public.products(is_flash_sale);

-- ---------- product_variants ----------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  size text,
  color text,
  stock int NOT NULL DEFAULT 0,
  sku text,
  UNIQUE (product_id, size, color)
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_read_public" ON public.product_variants;
CREATE POLICY "variants_read_public" ON public.product_variants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "variants_admin_write" ON public.product_variants;
CREATE POLICY "variants_admin_write" ON public.product_variants
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- reviews ----------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  author_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_read_public" ON public.reviews;
CREATE POLICY "reviews_read_public" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.reviews;
CREATE POLICY "reviews_insert_authenticated" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---------- orders ----------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  shipping_address text NOT NULL,
  city text,
  country text DEFAULT 'Bangladesh',
  subtotal_bdt numeric(10,2) NOT NULL DEFAULT 0,
  discount_bdt numeric(10,2) NOT NULL DEFAULT 0,
  shipping_bdt numeric(10,2) NOT NULL DEFAULT 0,
  total_bdt numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'unpaid',
  binance_txid text,
  coupon_code text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  ip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders;
CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT TO anon, authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "orders_insert_open" ON public.orders;
CREATE POLICY "orders_insert_open" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
CREATE POLICY "orders_admin_delete" ON public.orders
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);

-- ---------- order_items ----------
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  image_url text,
  size text,
  color text,
  unit_price_bdt numeric(10,2) NOT NULL,
  quantity int NOT NULL,
  line_total_bdt numeric(10,2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own_or_admin" ON public.order_items;
CREATE POLICY "order_items_select_own_or_admin" ON public.order_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
            AND (o.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "order_items_insert_open" ON public.order_items;
CREATE POLICY "order_items_insert_open" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_admin_update" ON public.order_items;
CREATE POLICY "order_items_admin_update" ON public.order_items
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "order_items_admin_delete" ON public.order_items;
CREATE POLICY "order_items_admin_delete" ON public.order_items
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---------- coupons ----------
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  value numeric(10,2) NOT NULL DEFAULT 0,
  min_order_bdt numeric(10,2) DEFAULT 0,
  max_discount_bdt numeric(10,2),
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_read_public" ON public.coupons;
CREATE POLICY "coupons_read_public" ON public.coupons
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "coupons_admin_write" ON public.coupons;
CREATE POLICY "coupons_admin_write" ON public.coupons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- coupon_usages ----------
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  code text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_usages_select_admin" ON public.coupon_usages;
CREATE POLICY "coupon_usages_select_admin" ON public.coupon_usages
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "coupon_usages_insert_open" ON public.coupon_usages;
CREATE POLICY "coupon_usages_insert_open" ON public.coupon_usages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- store_settings (singleton) ----------
CREATE TABLE IF NOT EXISTS public.store_settings (
  id int PRIMARY KEY DEFAULT 1,
  store_name text NOT NULL DEFAULT 'DHONG GHAR',
  tagline text,
  phone text,
  email text,
  address text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  whatsapp_url text,
  primary_color text DEFAULT '#e9b133',
  secondary_color text DEFAULT '#16171d',
  accent_color text DEFAULT '#14b8a6',
  bg_color text DEFAULT '#0b0c10',
  button_depth int DEFAULT 8,
  card_shadow int DEFAULT 20,
  hover_zoom int DEFAULT 6,
  border_radius int DEFAULT 18,
  facebook_pixel_id text,
  facebook_capi_token text,
  tiktok_pixel_id text,
  gtm_id text,
  ga4_id text,
  clarity_id text,
  bkash_number text,
  nagad_number text,
  card_enabled boolean DEFAULT true,
  cod_enabled boolean DEFAULT true,
  binance_pay_id text,
  usdt_wallet_address text,
  binance_qr_url text,
  bdt_to_usd_rate numeric(8,2) DEFAULT 120,
  gemini_api_key text,
  gemini_system_prompt text DEFAULT 'You are DHONG GHAR''s Customer Care AI assistant. Only answer queries regarding products, stock, pricing, order tracking, shipping policies, and return procedures of DHONG GHAR. Politely decline to answer any unrelated general questions.',
  fraud_shield_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read_public" ON public.store_settings;
CREATE POLICY "settings_read_public" ON public.store_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_write" ON public.store_settings;
CREATE POLICY "settings_admin_write" ON public.store_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.store_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ---------- fraud_blacklist ----------
CREATE TABLE IF NOT EXISTS public.fraud_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  value text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (kind, value)
);
ALTER TABLE public.fraud_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blacklist_read_admin" ON public.fraud_blacklist;
CREATE POLICY "blacklist_read_admin" ON public.fraud_blacklist
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "blacklist_admin_write" ON public.fraud_blacklist;
CREATE POLICY "blacklist_admin_write" ON public.fraud_blacklist
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- triggers ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_touch ON public.products;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS settings_touch ON public.store_settings;
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'DG-' || to_char(now(), 'YYMMDD') || '-' || lpad((random() * 99999)::bigint::text, 5, '0');
$$;
