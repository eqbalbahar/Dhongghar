import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/lib/types';
import { applyTheme } from '@/lib/format';

interface SettingsContextValue {
  settings: StoreSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const FALLBACK_SETTINGS: StoreSettings = {
  id: 1,
  store_name: 'DHONG GHAR',
  tagline: 'Luxury Fashion House',
  phone: '+880 1700-000000',
  email: 'care@dhongghar.com',
  address: 'Gulshan Avenue, Dhaka 1212, Bangladesh',
  facebook_url: 'https://facebook.com',
  instagram_url: 'https://instagram.com',
  tiktok_url: 'https://tiktok.com',
  whatsapp_url: 'https://wa.me/8801700000000',
  primary_color: '#e9b133',
  secondary_color: '#16171d',
  accent_color: '#14b8a6',
  bg_color: '#0b0c10',
  button_depth: 8,
  card_shadow: 20,
  hover_zoom: 6,
  border_radius: 18,
  facebook_pixel_id: null,
  facebook_capi_token: null,
  tiktok_pixel_id: null,
  gtm_id: null,
  ga4_id: null,
  clarity_id: null,
  bkash_number: null,
  nagad_number: null,
  card_enabled: true,
  cod_enabled: true,
  binance_pay_id: null,
  usdt_wallet_address: null,
  binance_qr_url: null,
  bdt_to_usd_rate: 120,
  gemini_api_key: null,
  gemini_system_prompt:
    "You are DHONG GHAR's Customer Care AI assistant. Only answer queries regarding products, stock, pricing, order tracking, shipping policies, and return procedures of DHONG GHAR. Politely decline to answer any unrelated general questions.",
  fraud_shield_enabled: true,
  bkash_instructions: null,
  nagad_instructions: null,
  rocket_number: null,
  rocket_instructions: null,
  card_instructions: null,
  cod_instructions: null,
  binance_instructions: null,
  card_gateway_name: null,
  card_merchant_key: null,
  card_secret_key: null,
  card_payment_url: null,
  hero_banners: null,
  hero_badge: null,
  hero_secondary_cta: null,
  hero_secondary_link: null,
  hero_font: 'serif',
  policy_return: '7 Days Easy Return Policy',
  policy_authentic: '100% Authentic Product',
  policy_shipping: 'Express Shipping All Over Bangladesh',
  policy_warranty: null,
  policy_support: '24/7 Customer Support',
  steadfast_api_key: null,
  steadfast_secret: null,
  steadfast_merchant_id: null,
  pathao_api_key: null,
  pathao_secret: null,
  pathao_merchant_id: null,
  redx_api_key: null,
  redx_secret: null,
  paperfly_api_key: null,
  paperfly_merchant_id: null,
  default_courier: 'steadfast',
  sms_api_key: null,
  sms_sender_id: null,
  sms_endpoint: null,
  default_theme: 'dark',
  theme_toggle_visible: true,
  hero_overlay_opacity: 65,
  hero_brightness: 100,
  hero_parallax: true,
  updated_at: new Date().toISOString(),
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    // The storefront reads from the anon-safe public view which excludes
    // merchant wallet numbers and courier secrets. Authenticated admin reads
    // the full row directly in AdminPage.
    const { data } = await supabase.from('store_settings_public').select('*').eq('id', 1).maybeSingle();
    if (data) {
      const merged = { ...FALLBACK_SETTINGS, ...(data as Partial<StoreSettings>) } as StoreSettings;
      setSettings(merged);
      applyTheme(merged);
      injectPixels(merged);
    } else {
      setSettings(FALLBACK_SETTINGS);
      applyTheme(FALLBACK_SETTINGS);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return <SettingsContext.Provider value={{ settings, loading, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// Inject analytics pixels based on settings. Only loads each once per session.
let injectedPixels: string[] = [];

function injectPixels(settings: StoreSettings) {
  if (typeof document === 'undefined') return;
  const inject = (id: string, fn: () => void) => {
    if (!id || injectedPixels.includes(id)) return;
    injectedPixels.push(id);
    fn();
  };

  if (settings.gtm_id) {
    const gtmId = settings.gtm_id.trim();
    inject(gtmId, () => {
      const s = document.createElement('script');
      s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
      document.head.appendChild(s);
      // GTM noscript body iframe
      const ns = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      ns.appendChild(iframe);
      document.body.insertBefore(ns, document.body.firstChild);
    });
  }

  if (settings.ga4_id) {
    const ga4Id = settings.ga4_id.trim();
    inject(ga4Id, () => {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
      document.head.appendChild(s);
      const i = document.createElement('script');
      i.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`;
      document.head.appendChild(i);
    });
  }

  if (settings.facebook_pixel_id) {
    const fbId = settings.facebook_pixel_id.trim();
    inject(fbId, () => {
      const s = document.createElement('script');
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbId}');fbq('track','PageView');`;
      document.head.appendChild(s);
    });
  }

  if (settings.tiktok_pixel_id) {
    inject(settings.tiktok_pixel_id, () => {
      const s = document.createElement('script');
      s.innerHTML = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=n,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=o||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${settings.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`;
      document.head.appendChild(s);
    });
  }

  if (settings.clarity_id) {
    inject(settings.clarity_id, () => {
      const s = document.createElement('script');
      s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${settings.clarity_id}");`;
      document.head.appendChild(s);
    });
  }
}
