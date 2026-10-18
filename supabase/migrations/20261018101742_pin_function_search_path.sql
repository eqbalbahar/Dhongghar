/*
# Pin function search_path to public

Addresses security advisor WARN-level findings (function_search_path_mutable)
by rebuilding each function with an explicit, immutable search_path = public.

Functions touched:
- is_admin()
- touch_updated_at()
- handle_new_user()
- generate_order_number()
- increment_coupon_used(text)
- lookup_order_by_number_or_phone(text)
*/

ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_order_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_coupon_used(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.lookup_order_by_number_or_phone(text) SET search_path = public, pg_temp;
