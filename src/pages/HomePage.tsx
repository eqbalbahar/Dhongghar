import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Gem, RotateCcw, Zap, Star } from 'lucide-react';
import { fetchCategories, fetchProducts } from '@/lib/catalog';
import type { Category, Product, HeroBanner } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { useSettings } from '@/context/SettingsContext';

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flash, setFlash] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const { settings } = useSettings();
  const heroParallax = settings?.hero_parallax ?? true;
  const heroBrightness = settings?.hero_brightness ?? 100;
  const heroOverlayOpacity = (settings?.hero_overlay_opacity ?? 65) / 100;

  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 800], [0, heroParallax ? 200 : 0]);
  const parallaxScale = useTransform(scrollY, [0, 800], [1, heroParallax ? 1.15 : 1]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchProducts({ flashSale: true, limit: 4 }).then(setFlash).catch(() => {});
    fetchProducts({ featured: true, limit: 8 }).then(setBestSellers).catch(() => {});
    fetchProducts({ limit: 8 }).then(setNewArrivals).catch(() => {});
  }, []);

  const banners: HeroBanner[] = (settings?.hero_banners && settings.hero_banners.length > 0)
    ? settings.hero_banners
    : [{ image: 'https://images.pexels.com/photos/20558827/pexels-photo-20558827.jpeg?auto=compress&cs=tinysrgb&h=1200', title: 'Wear the Extraordinary', subtitle: 'Handwoven sarees, premium tees, couture cosmetics & statement accessories — curated for the connoisseur.', cta: 'Shop Collection', link: '/shop' }];
  const [bannerIdx, setBannerIdx] = useState(0);
  const hero = banners[bannerIdx] || banners[0];
  const heroTitle = hero.title || 'Wear the Extraordinary';
  const titleParts = heroTitle.split(' ');
  const titleLast = titleParts.pop() || '';
  const titleFirst = titleParts.join(' ');

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  const policyBadges = [
    { icon: Truck, label: settings?.policy_shipping || 'Express Shipping' },
    { icon: ShieldCheck, label: settings?.policy_authentic || '100% Authentic' },
    { icon: RotateCcw, label: settings?.policy_return || '7 Days Easy Return' },
  ].filter((b) => b.label);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={bannerIdx}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <motion.img
              src={hero.image}
              alt=""
              style={heroParallax ? { y: parallaxY, scale: parallaxScale } : undefined}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/30" style={{ opacity: heroOverlayOpacity }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-ink-950/60" style={{ opacity: heroOverlayOpacity }} />
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_50%,transparent,rgba(11,12,16,0.7))]" />
            <div className="absolute inset-0" style={{ background: `rgba(11,12,16,${1 - heroBrightness / 100})`, mixBlendMode: 'multiply' }} />
          </motion.div>
        </AnimatePresence>

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="chip mb-5 border-gold-400/30 bg-gold-400/10 text-gold-300"
            >
              <Sparkles size={12} /> {settings?.tagline || 'Luxury Fashion House'} · Est. 2025
            </motion.span>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] text-ink-50 sm:text-6xl lg:text-7xl">
              {titleFirst} <span className="gold-text">{titleLast}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-200">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={hero.link || '/shop'} className="btn-gold px-7 py-3.5">{hero.cta || 'Shop Collection'} <ArrowRight size={16} /></Link>
              <Link to="/shop?flash=1" className="btn-ghost px-7 py-3.5"><Zap size={15} className="text-gold-400" /> Flash Sale</Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 text-sm text-ink-300">
              {policyBadges.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-2">
                  <f.icon size={16} className="text-gold-400" /> {f.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {banners.map((b, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                className={`h-2 rounded-full transition-all duration-500 ${i === bannerIdx ? 'w-10 bg-gold-sheen shadow-gold-glow' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                aria-label={`Show ${b.title}`}
              />
            ))}
          </div>
        )}

        {/* floating gold orbs */}
        <motion.div
          className="pointer-events-none absolute right-[8%] top-[20%] h-48 w-48 rounded-full bg-gold-400/20 blur-3xl"
          animate={{ y: [0, -24, 0], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 7, repeat: Infinity }}
        />
        <motion.div
          className="pointer-events-none absolute left-[5%] bottom-[10%] h-32 w-32 rounded-full bg-accent-500/15 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity }}
        />
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Curated Collections</p>
              <h2 className="mt-2 font-display text-4xl text-ink-50">Shop by Category</h2>
            </div>
            <Link to="/shop" className="hidden text-sm text-ink-300 hover:text-gold-300 sm:flex sm:items-center sm:gap-1">View all <ArrowRight size={14} /></Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.08}>
              <Link to={`/shop?category=${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl border border-white/10">
                <img src={c.image_url || 'https://images.pexels.com/photos/17503287/pexels-photo-17503287.jpeg?auto=compress&cs=tinysrgb&h=800'} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 transition-all duration-500 group-hover:ring-gold-400/40" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-2xl text-ink-50 drop-shadow-lg">{c.name}</h3>
                  <p className="mt-1 inline-flex translate-y-1 items-center gap-1 text-sm text-gold-300 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">Explore <ArrowRight size={13} /></p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FLASH SALE */}
      {flash.length > 0 && (
        <section className="relative overflow-hidden border-y border-danger/20 bg-gradient-to-r from-danger/10 via-ink-900 to-ink-900 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <Reveal>
              <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-danger"><Zap size={14} /> Limited time</p>
                  <h2 className="mt-2 font-display text-4xl text-ink-50">Flash Sale</h2>
                </div>
                {flash[0]?.flash_sale_ends_at && <CountdownTimer endsAt={flash[0].flash_sale_ends_at} />}
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {flash.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-400"><Star size={13} /> Most loved</p>
              <h2 className="mt-2 font-display text-4xl text-ink-50">Best Sellers</h2>
            </div>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {bestSellers.slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* EDITORIAL BANNER */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl border border-white/10">
            <img src="https://images.pexels.com/photos/38240621/pexels-photo-38240621.jpeg?auto=compress&cs=tinysrgb&h=900" alt="" loading="lazy" className="h-[40vh] w-full object-cover sm:h-[58vh]" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/40 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center p-8 sm:p-12">
              <span className="chip mb-3 border-gold-400/30 bg-gold-400/10 text-gold-300"><Gem size={12} /> The Edit</span>
              <h2 className="font-display text-3xl text-ink-50 sm:text-4xl">Couture, delivered to your door.</h2>
              <p className="mt-3 text-ink-200">Each piece is hand-selected and quality-checked before it reaches you. Pay with bKash, Nagad, card, COD, or Binance crypto.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['bKash', 'Nagad', 'Card', 'COD', 'Binance Pay'].map((m) => (
                  <span key={m} className="chip">{m}</span>
                ))}
              </div>
              <Link to="/shop" className="btn-gold mt-6 w-fit">Discover More <ArrowRight size={15} /></Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Fresh drops</p>
              <h2 className="mt-2 font-display text-4xl text-ink-50">New Arrivals</h2>
            </div>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {newArrivals.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
