export type Role = 'admin' | 'customer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price_bdt: number;
  compare_at_bdt: number | null;
  cost_bdt: number;
  stock: number;
  low_stock_threshold: number;
  sku: string | null;
  images: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
  is_flash_sale: boolean;
  flash_sale_ends_at: string | null;
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  status: string;
  discount_badge: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  custom_guarantees?: { label: string; icon?: string }[] | null;
  custom_features?: string[] | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  sku: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  unit_price_bdt: number;
  quantity: number;
  line_total_bdt: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'binance';
export type PaymentStatus = 'unpaid' | 'paid' | 'pending' | 'refunded';

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_address: string;
  city: string | null;
  district: string | null;
  country: string;
  subtotal_bdt: number;
  discount_bdt: number;
  shipping_bdt: number;
  total_bdt: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  binance_txid: string | null;
  trxid: string | null;
  coupon_code: string | null;
  status: OrderStatus;
  notes: string | null;
  ip: string | null;
  courier_name: string | null;
  courier_tracking: string | null;
  courier_consignment: string | null;
  courier_booked_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  value: number;
  min_order_bdt: number;
  max_discount_bdt: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HeroBanner {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  badge?: string;
  secondary_cta?: string;
  secondary_link?: string;
  font?: HeroFont;
}

export type HeroFont = 'serif' | 'sans' | 'playfair' | 'cinematic';

export interface StoreSettings {
  id: number;
  store_name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  bg_color: string;
  button_depth: number;
  card_shadow: number;
  hover_zoom: number;
  border_radius: number;
  facebook_pixel_id: string | null;
  facebook_capi_token: string | null;
  tiktok_pixel_id: string | null;
  gtm_id: string | null;
  ga4_id: string | null;
  clarity_id: string | null;
  bkash_number: string | null;
  nagad_number: string | null;
  card_enabled: boolean;
  cod_enabled: boolean;
  binance_pay_id: string | null;
  usdt_wallet_address: string | null;
  binance_qr_url: string | null;
  bdt_to_usd_rate: number;
  gemini_api_key: string | null;
  gemini_system_prompt: string;
  fraud_shield_enabled: boolean;
  // payment instructions
  bkash_instructions: string | null;
  nagad_instructions: string | null;
  rocket_number: string | null;
  rocket_instructions: string | null;
  card_instructions: string | null;
  cod_instructions: string | null;
  binance_instructions: string | null;
  // card gateway
  card_gateway_name: string | null;
  card_merchant_key: string | null;
  card_secret_key: string | null;
  card_payment_url: string | null;
  // hero banners
  hero_banners: HeroBanner[] | null;
  hero_badge: string | null;
  hero_secondary_cta: string | null;
  hero_secondary_link: string | null;
  hero_font: HeroFont | null;
  // policy texts
  policy_return: string | null;
  policy_authentic: string | null;
  policy_shipping: string | null;
  policy_warranty: string | null;
  policy_support: string | null;
  // courier
  steadfast_api_key: string | null;
  steadfast_secret: string | null;
  steadfast_merchant_id: string | null;
  pathao_api_key: string | null;
  pathao_secret: string | null;
  pathao_merchant_id: string | null;
  redx_api_key: string | null;
  redx_secret: string | null;
  paperfly_api_key: string | null;
  paperfly_merchant_id: string | null;
  default_courier: string | null;
  // SMS provider
  sms_api_key: string | null;
  sms_sender_id: string | null;
  sms_endpoint: string | null;
  default_theme: 'dark' | 'light';
  theme_toggle_visible: boolean;
  hero_overlay_opacity: number;
  hero_brightness: number;
  hero_parallax: boolean;
  updated_at: string;
}

export interface FraudBlacklist {
  id: string;
  kind: 'ip' | 'phone' | 'email';
  value: string;
  reason: string | null;
  created_at: string;
}
