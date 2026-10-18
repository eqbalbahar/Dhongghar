import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Currency } from '@/lib/format';
import { trackAddToCart } from '@/lib/tracking';
import { supabase } from '@/lib/supabase';

export interface CartItem {
  id: string; // product id
  slug: string;
  name: string;
  price_bdt: number;
  image: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  stock: number;
  lineKey: string; // unique per variant
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, 'lineKey' | 'quantity'>, quantity?: number) => void;
  remove: (lineKey: string) => void;
  updateQty: (lineKey: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalBdt: number;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  couponCode: string | null;
  couponDiscountBdt: number;
  appliedCoupon: { code: string; discount_bdt: number } | null;
  applyCoupon: (code: string, subtotal: number) => Promise<{ error: string | null; discount: number }>;
  removeCoupon: () => void;
  shippingBdt: number;
  totalBdt: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'dhong_ghar_cart';
const CURRENCY_KEY = 'dhong_ghar_currency';
const COUPON_KEY = 'dhong_ghar_coupon';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [currency, setCurrencyState] = useState<Currency>(() => (localStorage.getItem(CURRENCY_KEY) as Currency) || 'BDT');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_bdt: number } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(COUPON_KEY) || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
  }, [appliedCoupon]);

  const add: CartContextValue['add'] = (item, quantity = 1) => {
    const lineKey = `${item.id}-${item.size || '-'}-${item.color || '-'}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing) {
        return prev.map((i) => (i.lineKey === lineKey ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock || 99) } : i));
      }
      return [...prev, { ...item, lineKey, quantity }];
    });
    trackAddToCart({ id: item.id, name: item.name, price_bdt: item.price_bdt }, quantity);
  };

  const remove: CartContextValue['remove'] = (lineKey) => setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));

  const updateQty: CartContextValue['updateQty'] = (lineKey, qty) =>
    setItems((prev) => prev.map((i) => (i.lineKey === lineKey ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock || 99)) } : i)));

  const clear = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const setCurrency: CartContextValue['setCurrency'] = (c) => setCurrencyState(c);

  const subtotalBdt = items.reduce((s, i) => s + i.price_bdt * i.quantity, 0);

  const shippingBdt = subtotalBdt > 0 ? (subtotalBdt >= 5000 ? 0 : 80) : 0;

  const applyCoupon: CartContextValue['applyCoupon'] = async (code, subtotal) => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return { error: 'Invalid or expired coupon code', discount: 0 };
    const c = data as { discount_type: string; value: number; min_order_bdt: number; max_discount_bdt: number | null; usage_limit: number | null; used_count: number; expires_at: string | null };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { error: 'This coupon has expired', discount: 0 };
    if (c.usage_limit && c.used_count >= c.usage_limit) return { error: 'This coupon has reached its usage limit', discount: 0 };
    if (subtotal < c.min_order_bdt) return { error: `Minimum order ৳${c.min_order_bdt} required`, discount: 0 };
    let discount = c.discount_type === 'percentage' ? (subtotal * c.value) / 100 : c.value;
    if (c.max_discount_bdt) discount = Math.min(discount, c.max_discount_bdt);
    discount = Math.min(discount, subtotal);
    setAppliedCoupon({ code: code.toUpperCase().trim(), discount_bdt: discount });
    return { error: null, discount };
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const couponDiscountBdt = appliedCoupon?.discount_bdt ?? 0;
  const totalBdt = Math.max(0, subtotalBdt - couponDiscountBdt) + shippingBdt;
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const value: CartContextValue = {
    items,
    add,
    remove,
    updateQty,
    clear,
    count,
    subtotalBdt,
    currency,
    setCurrency,
    couponCode: appliedCoupon?.code ?? null,
    couponDiscountBdt,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    shippingBdt,
    totalBdt,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
