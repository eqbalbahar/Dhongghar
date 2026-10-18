import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, Zap } from 'lucide-react';
import { fetchCategories, fetchProducts } from '@/lib/catalog';
import type { Category, Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { classNames } from '@/lib/format';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'popular', label: 'Most Popular' },
];

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const categorySlug = params.get('category') || '';
  const search = params.get('search') || '';
  const flashOnly = params.get('flash') === '1';

  const [categories, setCategories] = useState<Category[]>([]);
  const [all, setAll] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMax, setPriceMax] = useState(30000);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchProducts({}).then((p) => {
      setAll(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...all];
    if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) {
        if (cat.parent_id) {
          list = list.filter((p) => p.category_id === cat.id);
        } else {
          const subIds = categories.filter((c) => c.parent_id === cat.id).map((c) => c.id);
          list = list.filter((p) => p.category_id === cat.id || subIds.includes(p.category_id || ''));
        }
      }
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s) || p.tags.some((t) => t.toLowerCase().includes(s)));
    }
    if (flashOnly) list = list.filter((p) => p.is_flash_sale);
    list = list.filter((p) => Number(p.price_bdt) <= priceMax);

    if (sort === 'price_low') list.sort((a, b) => Number(a.price_bdt) - Number(b.price_bdt));
    else if (sort === 'price_high') list.sort((a, b) => Number(b.price_bdt) - Number(a.price_bdt));
    else if (sort === 'popular') list.sort((a, b) => b.sales_count - a.sales_count);
    else list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return list;
  }, [all, categories, categorySlug, search, flashOnly, priceMax, sort]);

  const title = search ? `Results for "${search}"` : categorySlug ? categories.find((c) => c.slug === categorySlug)?.name ?? 'Shop' : flashOnly ? 'Flash Sale' : 'All Products';
  const subCats = categories.filter((c) => !c.parent_id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-4xl text-ink-50 sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-400">{filtered.length} {filtered.length === 1 ? 'item' : 'items'} found</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`w-64 shrink-0 ${showFilters ? 'fixed inset-0 z-50 lg:static lg:z-0' : 'hidden lg:block'}`}>
          {showFilters && <div className="absolute inset-0 bg-black/60 lg:hidden" onClick={() => setShowFilters(false)} />}
          <div className="glass relative z-10 h-full w-64 space-y-6 rounded-3xl p-5 lg:h-auto">
            <div className="flex items-center justify-between lg:hidden">
              <h3 className="font-display text-lg">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="btn-ghost p-2"><X size={14} /></button>
            </div>

            <div>
              <h4 className="mb-2 text-xs uppercase tracking-wider text-ink-400">Category</h4>
              <div className="space-y-1">
                <button onClick={() => setParams({})} className={classNames('block w-full rounded-lg px-3 py-2 text-left text-sm transition-all', !categorySlug ? 'bg-gold-sheen text-ink-950' : 'text-ink-200 hover:bg-white/5')}>All</button>
                {categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order).map((main) => (
                  <div key={main.id}>
                    <button onClick={() => setParams({ category: main.slug })} className={classNames('block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all', categorySlug === main.slug ? 'bg-gold-sheen text-ink-950' : 'text-ink-100 hover:bg-white/5')}>{main.name}</button>
                    <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                      {categories.filter((c) => c.parent_id === main.id).sort((a, b) => a.sort_order - b.sort_order).map((sub) => (
                        <button key={sub.id} onClick={() => setParams({ category: sub.slug })} className={classNames('block w-full rounded-lg px-3 py-1.5 text-left text-xs transition-all', categorySlug === sub.slug ? 'bg-gold-sheen/80 text-ink-950' : 'text-ink-300 hover:bg-white/5 hover:text-ink-100')}>{sub.name}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs uppercase tracking-wider text-ink-400">Max Price</h4>
              <input type="range" min={500} max={30000} step={500} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-gold-400" />
              <p className="mt-1 text-sm text-ink-300">Up to ৳{priceMax.toLocaleString()}</p>
            </div>

            <button onClick={() => setParams({ flash: '1' })} className={classNames('flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all', flashOnly ? 'bg-danger text-white' : 'border border-danger/30 text-danger hover:bg-danger/10')}>
              <Zap size={14} /> Flash Sale only
            </button>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button onClick={() => setShowFilters(true)} className="btn-ghost px-4 py-2.5 text-sm lg:hidden"><SlidersHorizontal size={14} /> Filters</button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-ink-400">Sort:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink-100 outline-none focus:border-gold-400/50">
                {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-ink-900">{s.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-3xl shimmer-bg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 py-20 text-center">
              <p className="text-ink-300">No products match your filters.</p>
              <button onClick={() => { setParams({}); setPriceMax(30000); }} className="btn-ghost mt-4">Reset filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
