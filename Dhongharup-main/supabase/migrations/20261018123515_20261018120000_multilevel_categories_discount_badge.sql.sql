/*
# Multi-Level Categories, Discount Badge, Admin Password Gate Seed

## What this migration does

1. **Multi-level categories**: Adds `parent_id` column to `categories` so categories
   can be nested (main category → sub-categories). Seeds 3 main categories and 15
   sub-categories matching the requested structure (Women's, Men's, Cosmetics & Lifestyle).
2. **Custom discount badge**: Adds `discount_badge` text column to `products` so the
   admin can set a custom badge string like "23% OFF" or "SPECIAL OFFER" per product,
   independent of the computed compare-at-price discount.
3. No security changes — existing RLS policies remain in place. New columns inherit
   the table's existing policies automatically.

## New columns
- `categories.parent_id` (uuid, nullable, self-referencing FK to categories.id) —
  null means top-level/main category; non-null means sub-category.
- `products.discount_badge` (text, nullable) — free-form badge text shown on product
  cards and detail pages (e.g. "23% OFF", "SPECIAL OFFER").

## Seeded data
- Main: Women's Fashion (slug: womens-fashion)
  Sub: Saree, Three Piece, Lingerie/Innerwear, Salwar Kameez, Tops
- Main: Men's Fashion (slug: mens-fashion)
  Sub: Panjabi, T-Shirt, Lungi, Shirt, Jeans
- Main: Cosmetics & Lifestyle (slug: cosmetics-lifestyle)
  Sub: Makeup, Skincare, Watches/Clocks, Bags & Purses, Jewelry & Accessories

## Notes
1. Uses `IF NOT EXISTS` for column additions and idempotent inserts via ON CONFLICT.
2. Sub-category slugs are unique across the table (existing UNIQUE constraint on slug).
3. sort_order is set so mains come first (0-2) then subs (10+).
*/

-- ---------- categories: add parent_id ----------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories(parent_id);

-- ---------- products: add discount_badge ----------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_badge text;

-- ---------- seed main categories ----------
INSERT INTO public.categories (name, slug, sort_order, parent_id)
VALUES
  ('Women''s Fashion', 'womens-fashion', 0, NULL),
  ('Men''s Fashion', 'mens-fashion', 1, NULL),
  ('Cosmetics & Lifestyle', 'cosmetics-lifestyle', 2, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ---------- seed sub-categories ----------
DO $$
DECLARE
  womens uuid;
  mens uuid;
  cosmos uuid;
BEGIN
  SELECT id INTO womens FROM public.categories WHERE slug = 'womens-fashion';
  SELECT id INTO mens   FROM public.categories WHERE slug = 'mens-fashion';
  SELECT id INTO cosmos FROM public.categories WHERE slug = 'cosmetics-lifestyle';

  INSERT INTO public.categories (name, slug, sort_order, parent_id) VALUES
    ('Saree',              'saree',              10, womens),
    ('Three Piece',        'three-piece',        11, womens),
    ('Lingerie/Innerwear', 'lingerie-innerwear', 12, womens),
    ('Salwar Kameez',      'salwar-kameez',      13, womens),
    ('Tops',               'tops',               14, womens),
    ('Panjabi',            'panjabi',            20, mens),
    ('T-Shirt',            't-shirt',            21, mens),
    ('Lungi',              'lungi',              22, mens),
    ('Shirt',              'shirt',              23, mens),
    ('Jeans',              'jeans',              24, mens),
    ('Makeup',             'makeup',             30, cosmos),
    ('Skincare',           'skincare',           31, cosmos),
    ('Watches/Clocks',     'watches-clocks',     32, cosmos),
    ('Bags & Purses',      'bags-purses',        33, cosmos),
    ('Jewelry & Accessories', 'jewelry-accessories', 34, cosmos)
  ON CONFLICT (slug) DO NOTHING;
END $$;