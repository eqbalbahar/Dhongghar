-- Add is_active column to categories for show/hide toggle on storefront
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill any existing rows
UPDATE categories SET is_active = true WHERE is_active IS NULL;

COMMENT ON COLUMN categories.is_active IS 'When false, the category is hidden from the storefront nav and homepage but remains in the admin panel.';
