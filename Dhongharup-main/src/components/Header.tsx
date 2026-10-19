import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search, ShoppingBag, User, X, ChevronDown, Sparkles, Zap, Sun, Moon, ArrowRight, Shield } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { fetchCategories, fetchProducts } from '@/lib/catalog';
import type { Category, Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { trackSearch } from '@/lib/tracking';

const NAV_LINKS: { label: string; slug: string }[] = [
  { label: "Women's Fashion", slug: 'womens-fashion' },
  { label: "Men's Fashion", slug: 'mens-fashion' },
  { label: 'Cosmetics & Lifestyle', slug: 'cosmetics-lifestyle' },
];

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { count, currency, setCurrency } = useCart();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { settings } = useSettings();
  const { theme, toggle, toggleVisible } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [flashProducts, setFlashProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchProducts({ flashSale: true, limit: 4 }).then(setFlashProducts).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      if (window.scrollY > 10) setMegaOpen(null);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Predictive search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetchProducts({ search: q, limit: 6 })
        .then(setResults)
        .catch(() => setResults([]));
      trackSearch(q);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const megaCats = useMemo(() => {
    const mains = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    return NAV_LINKS.map((n) => {
      const main = categories.find((c) => c.slug === n.slug) || mains.find((c) => c.slug === n.slug);
      const subs = main ? categories.filter((c) => c.parent_id === main.id).sort((a, b) => a.sort_order - b.sort_order) : [];
      return { ...n, category: main, subs };
    });
  }, [categories]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setMobileOpen(false);
    }
  };

  const announcement = settings?.announcement_bar_enabled
    ? {
        text: settings.announcement_bar_text || 'Free shipping on orders over ৳5,000 · Flash sale live now',
        link: settings.announcement_bar_link || null,
        theme: settings.announcement_bar_theme || 'gold',
      }
    : null;
  const announcementThemeClass: Record<string, string> = {
    gold: 'bg-gold-sheen text-ink-950',
    dark: 'bg-ink-900 text-gold-200 border-b border-gold-400/20',
    accent: 'bg-accent-600 text-white',
    danger: 'bg-danger text-white',
  };
  const announcementClass = announcementThemeClass[announcement?.theme || 'gold'] || announcementThemeClass.gold;
  const AnnouncementIcon = announcement?.theme === 'danger' ? Zap : Sparkles;

  return (
    <>
      {/* Announcement bar — admin-configurable */}
      {announcement && (
        <div className={`group relative z-40 overflow-hidden px-4 py-2 text-center text-[11px] font-semibold tracking-wide ${announcementClass}`}>
          <div className="shimmer-gold pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative">
            {announcement.link ? (
              <Link to={announcement.link} className="inline-flex items-center gap-1.5 transition-transform hover:scale-[1.02]">
                <AnnouncementIcon size={12} /> {announcement.text} <ArrowRight size={11} className="opacity-70 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <AnnouncementIcon size={12} /> {announcement.text}
              </span>
            )}
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-glass-lg' : ''}`}>
        <div className={`glass-strong border-b border-white/10 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4">
            {/* Left: mobile menu + logo */}
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden btn-ghost p-2" aria-label="Menu">
                <Menu size={18} />
              </button>
              <Link to="/" className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-sheen font-display text-xl font-bold text-ink-950 shadow-gold-glow">DG</span>
                <span className="hidden font-display text-2xl font-semibold tracking-wide sm:block">
                  <span className="text-ink-50">DHONG</span> <span className="gold-text">GHAR</span>
                </span>
              </Link>
            </div>

            {/* Center: nav */}
            <nav className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setMegaOpen(null)}>
              {megaCats.map((n) => (
                <div key={n.slug} onMouseEnter={() => setMegaOpen(n.slug)}>
                  <Link
                    to={`/shop?category=${n.slug}`}
                    className={`flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      megaOpen === n.slug ? 'bg-white/10 text-gold-300' : 'text-ink-100 hover:bg-white/5 hover:text-ink-50'
                    }`}
                  >
                    {n.label} <ChevronDown size={13} className={`transition-transform ${megaOpen === n.slug ? 'rotate-180' : ''}`} />
                  </Link>
                </div>
              ))}
              <Link to="/track-order" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-100 transition-all hover:bg-white/5 hover:text-ink-50">
                Track Order
              </Link>
            </nav>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              {toggleVisible && (
                <button
                  onClick={toggle}
                  className="btn-ghost p-2.5 transition-all"
                  aria-label="Toggle theme"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun size={17} className="text-gold-400" /> : <Moon size={17} className="text-gold-600" />}
                </button>
              )}

              <button onClick={() => setSearchOpen(true)} className="btn-ghost p-2.5" aria-label="Search">
                <Search size={17} />
              </button>

              <div className="hidden items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5 sm:flex">
                {(['BDT', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                      currency === c ? 'bg-gold-sheen text-ink-950' : 'text-ink-300 hover:text-ink-50'
                    }`}
                  >
                    {c === 'BDT' ? '৳' : '$'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <button onClick={() => setUserMenu((v) => !v)} className="btn-ghost p-2.5" aria-label="Account">
                  <User size={17} />
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="glass-dropdown absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl"
                      onMouseLeave={() => setUserMenu(false)}
                    >
                      {user ? (
                        <>
                          <div className="border-b border-white/10 px-4 py-3">
                            <p className="truncate text-sm font-semibold text-ink-50">{profile?.full_name || user.email}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gold-400">{profile?.role}</p>
                          </div>
                          <Link to="/account" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">My Account</Link>
                          <Link to="/account/orders" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">My Orders</Link>
                          <Link to="/track-order" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">Track Order</Link>
                          {isAdmin && (
                            <Link to="/eqbalbaharase" onClick={() => setUserMenu(false)} className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 text-sm font-semibold text-gold-300 hover:bg-gold-400/10"><Shield size={14} /> Admin Panel</Link>
                          )}
                          <button onClick={() => { signOut(); setUserMenu(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-white/5">Sign Out</button>
                        </>
                      ) : (
                        <>
                          <Link to="/auth" onClick={() => setUserMenu(false)} className="block px-4 py-3 text-sm font-semibold text-ink-50 hover:bg-white/5">Sign In / Sign Up</Link>
                          <Link to="/track-order" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-ink-100 hover:bg-white/5">Track Order</Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={onOpenCart} className="btn-ghost relative p-2.5" aria-label="Cart">
                <ShoppingBag size={17} />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-sheen px-1 text-[10px] font-bold text-ink-950 shadow-gold-glow">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mega menu */}
          <AnimatePresence>
            {megaOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-x-0 top-full hidden lg:block"
                onMouseEnter={() => setMegaOpen(megaOpen)}
              >
                <div className="glass-strong border-t border-white/10 px-4 py-6">
                  <div className="mx-auto grid max-w-7xl grid-cols-3 gap-8">
                    {megaCats.map((n) => (
                      <div key={n.slug} onMouseEnter={() => setMegaOpen(n.slug)}>
                        <Link
                          to={`/shop?category=${n.slug}`}
                          className="group mb-3 block overflow-hidden rounded-2xl"
                        >
                          <div className="relative h-24 overflow-hidden bg-ink-900">
                            {n.category?.image_url && <img src={n.category.image_url} alt={n.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                            <p className="absolute bottom-2 left-3 font-display text-lg text-ink-50">{n.label}</p>
                          </div>
                        </Link>
                        <div className="space-y-0.5">
                          <Link to={`/shop?category=${n.slug}`} className="block px-3 py-1.5 text-xs font-semibold text-gold-300 hover:bg-white/5">Shop all {n.label} →</Link>
                          {n.subs.map((sub) => (
                            <Link key={sub.id} to={`/shop?category=${sub.slug}`} onMouseEnter={() => setMegaOpen(n.slug)} className="block truncate px-3 py-1.5 text-sm text-ink-300 hover:bg-white/5 hover:text-ink-100">
                              {sub.name}
                            </Link>
                          ))}
                          {n.subs.length === 0 && <p className="px-3 py-1.5 text-xs text-ink-500">No subcategories yet.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div className="fixed inset-0 z-[80] flex justify-center p-4 pt-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSearchOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: -10 }}
              className="glass-strong relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl shadow-glass-lg"
            >
              <form onSubmit={submitSearch} className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <Search size={20} className="text-gold-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sarees, tees, cosmetics…"
                  className="flex-1 bg-transparent text-lg text-ink-50 outline-none placeholder-ink-400"
                />
                <button onClick={() => setSearchOpen(false)} className="btn-ghost p-2"><X size={16} /></button>
              </form>
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                {query.trim().length >= 2 && results.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-ink-400">No results for "{query}"</p>
                )}
                {results.length > 0 && (
                  <div className="space-y-1 p-2">
                    {results.map((p) => (
                      <Link
                        key={p.id}
                        to={`/product/${p.slug}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5"
                      >
                        <img src={p.images?.[0]} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-50">{p.name}</p>
                          <p className="text-xs text-gold-400">{formatMoney(Number(p.price_bdt), currency, settings)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {query.trim().length < 2 && (
                  <div className="p-5">
                    <p className="mb-3 text-xs uppercase tracking-wider text-ink-400">Trending</p>
                    <div className="flex flex-wrap gap-2">
                      {['Banarasi Silk', 'Cotton Tee', 'Lipstick', 'Handbag', 'Parfum'].map((t) => (
                        <button key={t} onClick={() => setQuery(t)} className="chip hover:border-gold-400/50 hover:text-gold-300">{t}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="glass-strong absolute left-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto p-5 scrollbar-thin"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-xl"><span className="text-ink-50">DHONG</span> <span className="gold-text">GHAR</span></span>
                <button onClick={() => setMobileOpen(false)} className="btn-ghost p-2"><X size={16} /></button>
              </div>
              <form onSubmit={submitSearch} className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <Search size={16} className="text-gold-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-sm text-ink-50 outline-none" />
              </form>
              <nav className="space-y-1">
                {megaCats.map((n) => (
                  <div key={n.slug}>
                    <Link to={`/shop?category=${n.slug}`} onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink-100 hover:bg-white/5">{n.label}</Link>
                    {n.subs.length > 0 && (
                      <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
                        {n.subs.map((sub) => (
                          <Link key={sub.id} to={`/shop?category=${sub.slug}`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-ink-300 hover:bg-white/5 hover:text-ink-100">{sub.name}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Link to="/track-order" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium text-ink-100 hover:bg-white/5">Track Order</Link>
                {user ? (
                  <>
                    <Link to="/account" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-ink-100 hover:bg-white/5">My Account</Link>
                    {isAdmin && (
                      <Link to="/eqbalbaharase" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gold-300 hover:bg-gold-400/10"><Shield size={14} /> Admin Panel</Link>
                    )}
                    <button onClick={() => { signOut(); setMobileOpen(false); }} className="block w-full rounded-xl px-4 py-3 text-left text-sm text-danger hover:bg-white/5">Sign Out</button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setMobileOpen(false)} className="block rounded-xl bg-gold-sheen px-4 py-3 text-center text-sm font-semibold text-ink-950">Sign In / Sign Up</Link>
                )}
              </nav>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                {(['BDT', 'USD'] as const).map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${currency === c ? 'bg-gold-sheen text-ink-950' : 'text-ink-300'}`}>{c === 'BDT' ? '৳ BDT' : '$ USD'}</button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
