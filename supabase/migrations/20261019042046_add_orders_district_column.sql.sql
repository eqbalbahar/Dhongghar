-- Add district column to orders for finer-grained delivery routing.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'district') THEN
    ALTER TABLE orders ADD COLUMN district text;
  END IF;
END $$;
