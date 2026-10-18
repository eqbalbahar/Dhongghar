import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Sparkles, Music2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

export function Footer() {
  const { settings } = useSettings();
  const s = settings;
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-ink-950/60">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-sheen font-display text-xl font-bold text-ink-950">DG</span>
              <span className="font-display text-2xl"><span className="text-ink-50">DHONG</span> <span className="gold-text">GHAR</span></span>
            </Link>
            <p className="mt-3 text-sm text-ink-400">{s?.tagline || 'Luxury Fashion House'}. Crafted for the modern connoisseur.</p>
            <div className="mt-4 flex gap-2">
              {[
                { url: s?.facebook_url, icon: Facebook },
                { url: s?.instagram_url, icon: Instagram },
                { url: s?.tiktok_url, icon: Music2 },
                { url: s?.whatsapp_url, icon: MessageCircle },
              ].map(({ url, icon: Icon }, idx) =>
                url ? (
                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-200 transition-all hover:border-gold-400/50 hover:text-gold-300">
                    <Icon size={15} />
                  </a>
                ) : null
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-display text-lg text-ink-50">Shop</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link to="/shop?category=saree" className="hover:text-gold-300">Sarees</Link></li>
              <li><Link to="/shop?category=t-shirt" className="hover:text-gold-300">T-Shirts</Link></li>
              <li><Link to="/shop?category=cosmetics" className="hover:text-gold-300">Cosmetics</Link></li>
              <li><Link to="/shop?category=accessories" className="hover:text-gold-300">Accessories</Link></li>
              <li><Link to="/shop?flash=1" className="hover:text-gold-300">Flash Sale</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-lg text-ink-50">Help</h4>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link to="/track-order" className="hover:text-gold-300">Track Order</Link></li>
              <li><Link to="/account" className="hover:text-gold-300">My Account</Link></li>
              <li><Link to="/account/orders" className="hover:text-gold-300">Order History</Link></li>
              <li><span className="text-ink-500">Shipping & Returns</span></li>
              <li><span className="text-ink-500">FAQ</span></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-lg text-ink-50">Contact</h4>
            <ul className="space-y-3 text-sm text-ink-300">
              {s?.phone && <li className="flex items-center gap-2"><Phone size={14} className="text-gold-400" /> {s.phone}</li>}
              {s?.email && <li className="flex items-center gap-2"><Mail size={14} className="text-gold-400" /> {s.email}</li>}
              {s?.address && <li className="flex items-center gap-2"><MapPin size={14} className="text-gold-400" /> {s.address}</li>}
            </ul>
            <div className="mt-4 rounded-2xl border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-gold-200">
              <Sparkles size={12} className="mb-1 inline" /> Need help? Ask our AI assistant — bottom right.
            </div>
          </div>
        </div>

        <div className="mt-10 hairline" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row">
          <p>© {year} DHONG GHAR. All rights reserved.</p>
          <p>Crafted with luxury in mind · Secured by Supabase RLS</p>
        </div>
      </div>
    </footer>
  );
}
