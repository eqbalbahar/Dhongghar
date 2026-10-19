// Standard GA4 e-commerce dataLayer + pixel event tracking.
// Pushes GA4-standard event names (view_item, add_to_cart, begin_checkout, purchase)
// to window.dataLayer for GTM/GA4, and maps to Facebook + TikTok pixel events.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
    gtag?: (...args: unknown[]) => void;
    clarity?: { stop: () => void };
  }
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
  discount?: number;
}

export function pushDataLayer(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // GA4 ecommerce standard: event + ecommerce object with items array
  window.dataLayer.push({ event, ecommerce: params, ...params });
}

function pushGtag(event: string, params: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', event, params);
    } catch {
      /* gtag not ready */
    }
  }
}

export function trackViewContent(product: {
  id: string;
  name: string;
  price_bdt: number;
  category?: string;
}) {
  const items: EcommerceItem[] = [
    { item_id: product.id, item_name: product.name, price: product.price_bdt, quantity: 1, item_category: product.category },
  ];
  const payload = {
    currency: 'BDT',
    value: product.price_bdt,
    items,
  };
  pushDataLayer('view_item', payload);
  pushGtag('view_item', payload);

  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price_bdt,
        currency: 'BDT',
      });
    } catch { /* pixel not loaded */ }
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('ViewContent', {
        content_id: product.id,
        content_name: product.name,
        value: product.price_bdt,
        currency: 'BDT',
      });
    } catch { /* tiktok not loaded */ }
  }
}

export function trackAddToCart(
  product: { id: string; name: string; price_bdt: number; category?: string },
  quantity = 1
) {
  const items: EcommerceItem[] = [
    { item_id: product.id, item_name: product.name, price: product.price_bdt, quantity, item_category: product.category },
  ];
  const payload = {
    currency: 'BDT',
    value: product.price_bdt * quantity,
    items,
  };
  pushDataLayer('add_to_cart', payload);
  pushGtag('add_to_cart', payload);

  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price_bdt * quantity,
        currency: 'BDT',
      });
    } catch { /* pixel not loaded */ }
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('AddToCart', {
        content_id: product.id,
        content_name: product.name,
        value: product.price_bdt * quantity,
        currency: 'BDT',
        quantity,
      });
    } catch { /* tiktok not loaded */ }
  }
}

export function trackInitiateCheckout(cart: {
  total: number;
  items: { id: string; name: string; price: number; quantity: number; category?: string }[];
}) {
  const items: EcommerceItem[] = cart.items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
    item_category: i.category,
  }));
  const payload = {
    currency: 'BDT',
    value: cart.total,
    items,
  };
  pushDataLayer('begin_checkout', payload);
  pushGtag('begin_checkout', payload);

  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', 'InitiateCheckout', {
        value: cart.total,
        currency: 'BDT',
        num_items: cart.items.reduce((s, i) => s + i.quantity, 0),
        content_ids: cart.items.map((i) => i.id),
      });
    } catch { /* pixel not loaded */ }
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('InitiateCheckout', { value: cart.total, currency: 'BDT' });
    } catch { /* tiktok not loaded */ }
  }
}

export function trackPurchase(order: {
  id: string;
  order_number: string;
  total: number;
  tax?: number;
  shipping?: number;
  items: { id: string; name: string; price: number; quantity: number; category?: string }[];
}) {
  const items: EcommerceItem[] = order.items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
    item_category: i.category,
  }));
  const payload = {
    transaction_id: order.order_number,
    value: order.total,
    currency: 'BDT',
    tax: order.tax ?? 0,
    shipping: order.shipping ?? 0,
    items,
  };
  pushDataLayer('purchase', payload);
  pushGtag('purchase', payload);

  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', 'Purchase', {
        value: order.total,
        currency: 'BDT',
        content_ids: order.items.map((i) => i.id),
        content_type: 'product',
        num_items: order.items.reduce((s, i) => s + i.quantity, 0),
      });
    } catch { /* pixel not loaded */ }
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('CompletePayment', {
        value: order.total,
        currency: 'BDT',
        content_id: order.order_number,
      });
    } catch { /* tiktok not loaded */ }
  }
}

export function trackSearch(query: string) {
  const payload = { search_term: query };
  pushDataLayer('search', payload);
  pushGtag('search', payload);
  if (typeof window.fbq === 'function') {
    try { window.fbq('track', 'Search', { search_string: query }); } catch { /* pixel not loaded */ }
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    try { window.ttq.track('Search', { search_string: query }); } catch { /* tiktok not loaded */ }
  }
}

// Backward-compatible aliases
export const trackViewContentLegacy = trackViewContent;
