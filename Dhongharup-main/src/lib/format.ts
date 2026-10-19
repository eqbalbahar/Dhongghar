// Format money in BDT or USD based on user currency preference.
import type { StoreSettings } from './types';

export type Currency = 'BDT' | 'USD';

export function formatMoney(amountBdt: number, currency: Currency, settings?: { bdt_to_usd_rate: number } | null): string {
  if (currency === 'USD') {
    const rate = settings?.bdt_to_usd_rate || 120;
    const usd = amountBdt / rate;
    return `$${usd.toFixed(2)}`;
  }
  return `৳${Math.round(amountBdt).toLocaleString('en-BD')}`;
}

export function convertBdtToUsd(amountBdt: number, rate = 120): number {
  return amountBdt / rate;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function discountPct(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function timeLeftEndsAt(iso: string): { h: number; m: number; s: number; done: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
  return {
    h: Math.floor(diff / 3.6e6),
    m: Math.floor((diff % 3.6e6) / 6e4),
    s: Math.floor((diff % 6e4) / 1000),
    done: false,
  };
}

export function classNames(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

export function applyTheme(settings: { primary_color: string; secondary_color: string; accent_color: string; bg_color: string; button_depth: number; card_shadow: number; hover_zoom: number; border_radius: number }): void {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', settings.primary_color);
  root.style.setProperty('--brand-secondary', settings.secondary_color);
  root.style.setProperty('--brand-accent', settings.accent_color);
  root.style.setProperty('--brand-bg', settings.bg_color);
  root.style.setProperty('--radius-base', `${settings.border_radius}px`);
  root.style.setProperty('--shadow-card', `0 ${Math.round(settings.card_shadow * 0.4)}px ${settings.card_shadow}px -8px rgba(0,0,0,0.6)`);
  root.style.setProperty('--shadow-btn', `0 ${Math.round(settings.button_depth * 0.4)}px ${settings.button_depth}px -4px rgba(0,0,0,0.55)`);
  root.style.setProperty('--hover-zoom', `${settings.hover_zoom / 100}`);
}
