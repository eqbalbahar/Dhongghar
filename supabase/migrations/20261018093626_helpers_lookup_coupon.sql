/*
# Coupon increment + order lookup helpers

1. New Functions
- `increment_coupon_used(code text)` — atomically bumps `used_count` on a coupon.
- `lookup_order_by_number_or_phone(query text)` — returns orders matching an order
  number OR a phone number (for the public Track Order page).
2. Security
- Both SECURITY DEFINER, owned by postgres, safe for anon invocation.
*/

CREATE OR REPLACE FUNCTION public.increment_coupon_used(code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1 WHERE coupons.code = upper(code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_used(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_order_by_number_or_phone(query text)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.orders
  WHERE order_number ILIKE query
     OR customer_phone = query
  ORDER BY created_at DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order_by_number_or_phone(text) TO anon, authenticated;
