// Lightweight dataLayer + pixel event tracking.
// All e-commerce events push to window.dataLayer for GTM/GA4,
// and trigger Facebook Pixel + TikTok Pixel if loaded.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
    clarity?: { stop: () => void };
  }
}

export type TrackingEvent =
  | 'view_content'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'initiate_checkout'
  | 'add_payment_info'
  | 'purchase'
  | 'search'
  | 'apply_coupon'
  | 'begin_search';

interface TrackParams {
  [key: string]: unknown;
}

export function pushDataLayer(event: string, params: TrackParams = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ecommerce: params, ...params });
}

export function track(event: TrackingEvent, params: TrackParams = {}) {
  pushDataLayer(event, params);

  // Facebook Pixel mapping
  const fbMap: Record<TrackingEvent, string | null> = {
    view_content: 'ViewContent',
    add_to_cart: 'AddToCart',
    remove_from_cart: null,
    initiate_checkout: 'InitiateCheckout',
    add_payment_info: 'AddPaymentInfo',
    purchase: 'Purchase',
    search: 'Search',
    apply_coupon: null,
    begin_search: 'Search',
  };
  const fbEvent = fbMap[event];
  if (fbEvent && typeof window.fbq === 'function') {
    try {
      window.fbq('track', fbEvent, params);
    } catch {
      /* pixel not loaded */
    }
  }

  // TikTok Pixel mapping
  const ttMap: Record<TrackingEvent, string | null> = {
    view_content: 'ViewContent',
    add_to_cart: 'AddToCart',
    remove_from_cart: 'RemoveFromCart',
    initiate_checkout: 'InitiateCheckout',
    add_payment_info: 'AddPaymentInfo',
    purchase: 'CompletePayment',
    search: 'Search',
    apply_coupon: null,
    begin_search: 'Search',
  };
  const ttEvent = ttMap[event];
  if (ttEvent && window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track(ttEvent, params);
    } catch {
      /* tiktok not loaded */
    }
  }
}

export function trackViewContent(product: { id: string; name: string; price_bdt: number }) {
  track('view_content', {
    content_id: product.id,
    content_name: product.name,
    value: product.price_bdt,
    currency: 'BDT',
    items: [{ id: product.id, name: product.name, price: product.price_bdt, quantity: 1 }],
  });
}

export function trackAddToCart(product: { id: string; name: string; price_bdt: number }, quantity = 1) {
  track('add_to_cart', {
    content_id: product.id,
    content_name: product.name,
    value: product.price_bdt * quantity,
    currency: 'BDT',
    items: [{ id: product.id, name: product.name, price: product.price_bdt, quantity }],
  });
}

export function trackInitiateCheckout(cart: { total: number; items: { id: string; name: string; price: number; quantity: number }[] }) {
  track('initiate_checkout', {
    value: cart.total,
    currency: 'BDT',
    items: cart.items,
    num_items: cart.items.reduce((s, i) => s + i.quantity, 0),
  });
}

export function trackPurchase(order: { id: string; order_number: string; total: number; items: { id: string; name: string; price: number; quantity: number }[] }) {
  track('purchase', {
    transaction_id: order.order_number,
    value: order.total,
    currency: 'BDT',
    items: order.items,
  });
}

export function trackSearch(query: string) {
  track('search', { search_string: query });
}
