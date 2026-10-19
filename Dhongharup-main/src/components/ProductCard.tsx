import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Zap, Eye } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatMoney, discountPct } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { TiltCard } from '@/components/ui/TiltCard';
import { StarRating } from '@/components/ui/StarRating';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { trackAddToCart } from '@/lib/tracking';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const { settings } = useSettings();
  const currency = useCart().currency;
  const discount = discountPct(Number(product.price_bdt), product.compare_at_bdt ? Number(product.compare_at_bdt) : null);
  const lowStock = product.stock > 0 && product.stock <= product.low_stock_threshold;
  const soldOut = product.stock <= 0;
  const img = product.images?.[0] ?? '';

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (soldOut) return;
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_bdt: Number(product.price_bdt),
      image: img,
      size: product.sizes?.[0] ?? null,
      color: product.colors?.[0] ?? null,
      stock: product.stock,
    });
    trackAddToCart({ id: product.id, name: product.name, price_bdt: Number(product.price_bdt) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/product/${product.slug}`} className="group block">
        <TiltCard className="card-3d relative overflow-hidden transition-all duration-300 group-hover:border-gold-400/30 group-hover:shadow-glass-lg" intensity={6}>
          {/* Image */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-3xl bg-ink-900">
            {img && (
              <img
                src={img}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1.5">
              {product.discount_badge && (
                <span className="rounded-full bg-gold-sheen px-2.5 py-1 text-[10px] font-bold text-ink-950 shadow-gold-glow">
                  {product.discount_badge}
                </span>
              )}
              {!product.discount_badge && discount > 0 && (
                <span className="rounded-full bg-gold-sheen px-2.5 py-1 text-[10px] font-bold text-ink-950 shadow-gold-glow">
                  -{discount}%
                </span>
              )}
              {product.is_flash_sale && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/90 px-2.5 py-1 text-[10px] font-bold text-white">
                  <Zap size={10} /> FLASH
                </span>
              )}
              {soldOut && <span className="rounded-full bg-ink-900/90 px-2.5 py-1 text-[10px] font-bold text-ink-200">SOLD OUT</span>}
            </div>

            {lowStock && !soldOut && (
              <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-warning backdrop-blur">
                Only {product.stock} left
              </div>
            )}

            {/* Quick actions */}
            <div className="absolute bottom-3 left-3 right-3 flex translate-y-3 items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <button
                onClick={quickAdd}
                disabled={soldOut}
                className="btn-gold flex-1 px-3 py-2 text-xs disabled:opacity-50"
              >
                <ShoppingBag size={13} /> Add
              </button>
              <span className="btn-ghost px-3 py-2 text-xs">
                <Eye size={13} /> View
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <StarRating rating={Number(product.rating_avg)} size={12} />
              <span className="text-[10px] text-ink-400">({product.rating_count})</span>
            </div>
            <h3 className="line-clamp-1 font-display text-lg leading-tight text-ink-50">{product.name}</h3>
            {product.category?.name && <p className="text-[11px] uppercase tracking-wider text-gold-400/80">{product.category.name}</p>}

            <div className="flex items-end justify-between pt-1">
              <div>
                <p className="font-semibold text-ink-50">{formatMoney(Number(product.price_bdt), currency, settings)}</p>
                {product.compare_at_bdt && Number(product.compare_at_bdt) > Number(product.price_bdt) && (
                  <p className="text-xs text-ink-400 line-through">{formatMoney(Number(product.compare_at_bdt), currency, settings)}</p>
                )}
              </div>
              {product.is_flash_sale && product.flash_sale_ends_at && (
                <CountdownTimer endsAt={product.flash_sale_ends_at} compact />
              )}
            </div>
          </div>
        </TiltCard>
      </Link>
    </motion.div>
  );
}
