import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, ShoppingBag, Zap, Truck, ShieldCheck, RotateCcw, Ruler, Star, Check } from 'lucide-react';
import { fetchProductBySlug, fetchProductReviews, fetchProducts } from '@/lib/catalog';
import type { Product, Review } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, discountPct } from '@/lib/format';
import { StarRating } from '@/components/ui/StarRating';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { Modal } from '@/components/ui/Modal';
import { ProductCard } from '@/components/ProductCard';
import { trackAddToCart, trackViewContent } from '@/lib/tracking';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function ProductDetailPage({ onOpenCart }: { onOpenCart: () => void }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { settings } = useSettings();
  const { currency } = useCart();
  const { user, profile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [reviewForm, setReviewForm] = useState({ open: false, rating: 5, title: '', body: '', author: '', submitting: false, msg: '' });

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setQty(1);
    fetchProductBySlug(slug as string)
      .then((p) => {
        setProduct(p);
        if (p) {
          setColor(p.colors?.[0] ?? null);
          setSize(p.sizes?.[0] ?? null);
          trackViewContent({ id: p.id, name: p.name, price_bdt: Number(p.price_bdt), category: p.category?.name });
          fetchProductReviews(p.id).then(setReviews).catch(() => {});
          // related: same category
          fetchProducts({ category: p.category_id ?? undefined, limit: 5 }).then((r) => setRelated(r.filter((x) => x.id !== p.id).slice(0, 4)));
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const discount = product && discountPct(Number(product.price_bdt), product.compare_at_bdt ? Number(product.compare_at_bdt) : null);
  const lowStock = product && product.stock > 0 && product.stock <= product.low_stock_threshold;

  const handleAdd = () => {
    if (!product) return;
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_bdt: Number(product.price_bdt),
      image: product.images[0],
      color,
      size,
      stock: product.stock,
    }, qty);
    trackAddToCart({ id: product.id, name: product.name, price_bdt: Number(product.price_bdt), category: product.category?.name }, qty);
    onOpenCart();
  };

  const handleBuyNow = () => {
    handleAdd();
    navigate('/checkout');
  };

  const submitReview = async () => {
    if (!product || !reviewForm.author.trim() || !reviewForm.body.trim()) {
      setReviewForm((f) => ({ ...f, msg: 'Please fill your name and review.' }));
      return;
    }
    setReviewForm((f) => ({ ...f, submitting: true, msg: '' }));
    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      author_name: reviewForm.author,
      rating: reviewForm.rating,
      title: reviewForm.title || null,
      body: reviewForm.body,
      user_id: user?.id || null,
    });
    if (error) {
      setReviewForm((f) => ({ ...f, submitting: false, msg: error.message }));
      return;
    }
    fetchProductReviews(product.id).then(setReviews);
    setReviewForm({ open: false, rating: 5, title: '', body: '', author: profile?.full_name || '', submitting: false, msg: 'Thank you! Your review has been posted.' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[3/4] rounded-3xl shimmer-bg" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 rounded-xl shimmer-bg" />
            <div className="h-6 w-1/3 rounded-xl shimmer-bg" />
            <div className="h-24 w-full rounded-xl shimmer-bg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <h1 className="font-display text-3xl text-ink-50">Product not found</h1>
        <Link to="/shop" className="btn-gold mt-6 inline-flex">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-ink-400">
        <Link to="/" className="hover:text-gold-300">Home</Link>
        <ChevronRight size={12} />
        <Link to="/shop" className="hover:text-gold-300">Shop</Link>
        {product.category && <>
          <ChevronRight size={12} />
          <Link to={`/shop?category=${product.category.slug}`} className="hover:text-gold-300">{product.category.name}</Link>
        </>}
        <ChevronRight size={12} />
        <span className="text-ink-200">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-ink-900"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoomPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              setZoom(true);
            }}
            onMouseLeave={() => setZoom(false)}
          >
            <img
              src={product.images[activeImg]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300"
              style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
            />
            {discount ? <span className="absolute left-4 top-4 rounded-full bg-gold-sheen px-3 py-1 text-xs font-bold text-ink-950">-{discount}%</span> : null}
            {product.is_flash_sale && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-danger px-3 py-1 text-xs font-bold text-white"><Zap size={11} /> FLASH</span>}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImg === i ? 'border-gold-400' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            {product.category && <p className="text-xs uppercase tracking-[0.2em] text-gold-400">{product.category.name}</p>}
            <h1 className="mt-1 font-display text-4xl text-ink-50 sm:text-5xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <StarRating rating={Number(product.rating_avg)} size={16} />
              <span className="text-sm text-ink-300">{product.rating_avg.toFixed(1)} · {product.rating_count} reviews</span>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <p className="font-display text-3xl text-gold-300">{formatMoney(Number(product.price_bdt), currency, settings)}</p>
            {product.compare_at_bdt && Number(product.compare_at_bdt) > Number(product.price_bdt) && (
              <p className="text-lg text-ink-400 line-through">{formatMoney(Number(product.compare_at_bdt), currency, settings)}</p>
            )}
          </div>

          {product.is_flash_sale && product.flash_sale_ends_at && (
            <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Zap size={16} className="text-danger" />
              <span className="text-sm text-ink-100">Flash sale ends in</span>
              <CountdownTimer endsAt={product.flash_sale_ends_at} />
            </div>
          )}

          {lowStock && (
            <div className="flex items-center gap-2 rounded-xl bg-warning/15 px-4 py-2.5 text-sm text-warning">
              <span className="h-2 w-2 animate-glow-pulse rounded-full bg-warning" /> Only {product.stock} left in stock!
            </div>
          )}

          <p className="text-ink-200">{product.description}</p>

          {/* Colors */}
          {product.colors.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">Color: <span className="text-ink-100">{color}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-2xl border px-4 py-2 text-sm transition-all ${color === c ? 'border-gold-400 bg-gold-400/10 text-gold-200' : 'border-white/10 text-ink-200 hover:border-white/30'}`}
                  >{c}</button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-ink-400">Size: <span className="text-ink-100">{size}</span></p>
                <button onClick={() => setSizeChartOpen(true)} className="flex items-center gap-1 text-xs text-gold-300 hover:text-gold-200"><Ruler size={12} /> Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-12 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${size === s ? 'border-gold-400 bg-gold-400/10 text-gold-200' : 'border-white/10 text-ink-200 hover:border-white/30'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-9 w-9 place-items-center rounded-lg text-ink-200 hover:bg-white/10"><Minus size={15} /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="grid h-9 w-9 place-items-center rounded-lg text-ink-200 hover:bg-white/10"><Plus size={15} /></button>
            </div>
            <button onClick={handleAdd} disabled={product.stock <= 0} className="btn-ghost flex-1 disabled:opacity-40"><ShoppingBag size={16} /> Add to Cart</button>
            <button onClick={handleBuyNow} disabled={product.stock <= 0} className="btn-gold flex-1 disabled:opacity-40">Buy Now</button>
          </div>

          {/* Trust badges — uses global policy settings, overridden by per-product custom guarantees */}
          {(() => {
            const customs = product.custom_guarantees && product.custom_guarantees.length > 0 ? product.custom_guarantees : null;
            const badges = customs
              ? customs.map((g) => ({ icon: ShieldCheck, label: g.label }))
              : [
                  { icon: Truck, label: settings?.policy_shipping || 'Express Shipping' },
                  { icon: ShieldCheck, label: settings?.policy_authentic || '100% Authentic' },
                  { icon: RotateCcw, label: settings?.policy_return || '7 Days Easy Return' },
                ].filter((b) => b.label);
            return (
              <div className={`grid gap-3 pt-4 ${badges.length === 2 ? 'grid-cols-2' : badges.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {badges.map((f, i) => (
                  <div key={i} className="glass-soft flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center">
                    <f.icon size={18} className="text-gold-400" />
                    <span className="text-[11px] text-ink-300">{f.label}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Per-product custom features / highlights */}
          {product.custom_features && product.custom_features.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-gold-400">Highlights</p>
              <ul className="space-y-1.5">
                {product.custom_features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-200">
                    <Check size={14} className="mt-0.5 shrink-0 text-accent-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Frequently Bought Together */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl text-ink-50">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-16">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink-50">Customer Reviews ({reviews.length})</h2>
          <button onClick={() => setReviewForm((f) => ({ ...f, open: true, author: profile?.full_name || '', msg: '' }))} className="btn-ghost px-4 py-2 text-sm">Write a Review</button>
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-ink-400">No reviews yet. Be the first to share your experience!</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-3d p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gold-sheen font-display font-bold text-ink-950">{r.author_name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-ink-50">{r.author_name}</p>
                      <p className="text-[10px] text-ink-400">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <StarRating rating={r.rating} size={13} />
                </div>
                {r.title && <h4 className="mt-3 font-medium text-ink-100">{r.title}</h4>}
                <p className="mt-1 text-sm text-ink-300">{r.body}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-ink-400">{product.name}</p>
            <p className="font-semibold text-gold-300">{formatMoney(Number(product.price_bdt), currency, settings)}</p>
          </div>
          <button onClick={handleAdd} disabled={product.stock <= 0} className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-40"><ShoppingBag size={15} /></button>
          <button onClick={handleBuyNow} disabled={product.stock <= 0} className="btn-gold px-5 py-2.5 text-sm disabled:opacity-40">Buy Now</button>
        </div>
      </div>

      {/* Size chart modal */}
      <Modal open={sizeChartOpen} onClose={() => setSizeChartOpen(false)} title="Size Chart" size="md">
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gold-300">
                <th className="py-2">Size</th><th className="py-2">Chest (in)</th><th className="py-2">Length (in)</th><th className="py-2">Waist (in)</th>
              </tr>
            </thead>
            <tbody className="text-ink-200">
              {[
                ['S', 36, 26, 30],
                ['M', 40, 27, 34],
                ['L', 44, 28, 38],
                ['XL', 48, 29, 42],
                ['Free Size', 'Adjustable', 'Adjustable', 'Adjustable'],
                ['One Size', 'Universal', 'Universal', 'Universal'],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-white/5">
                  {row.map((c, i) => <td key={i} className="py-2.5">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal open={reviewForm.open} onClose={() => setReviewForm((f) => ({ ...f, open: false }))} title="Write a Review" size="md">
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Your Name</label>
            <input value={reviewForm.author} onChange={(e) => setReviewForm((f) => ({ ...f, author: e.target.value }))} className="input-glass" placeholder="e.g. Ayesha R." />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewForm((f) => ({ ...f, rating: n }))} className={n <= reviewForm.rating ? 'text-gold-400' : 'text-ink-600'}>
                  <Star size={26} className={n <= reviewForm.rating ? 'fill-gold-400' : ''} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Title (optional)</label>
            <input value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} className="input-glass" placeholder="Summarize your experience" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Review</label>
            <textarea value={reviewForm.body} onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))} className="input-glass min-h-24 resize-none" placeholder="What did you love? What could be better?" />
          </div>
          {reviewForm.msg && (
            <p className={`flex items-center gap-1.5 text-sm ${reviewForm.msg.includes('Thank you') ? 'text-accent-300' : 'text-danger'}`}>
              {reviewForm.msg.includes('Thank you') && <Check size={14} />} {reviewForm.msg}
            </p>
          )}
          <button onClick={submitReview} disabled={reviewForm.submitting} className="btn-gold w-full disabled:opacity-50">{reviewForm.submitting ? 'Posting…' : 'Post Review'}</button>
        </div>
      </Modal>
    </div>
  );
}
