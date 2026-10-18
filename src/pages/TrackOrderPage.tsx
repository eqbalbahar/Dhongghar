import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Package, CheckCircle2, Clock, Truck, Home, XCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/format';
import type { Order, OrderItem } from '@/lib/types';

const STEPS = [
  { id: 'pending', label: 'Order Placed', icon: Clock },
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: Home },
] as const;

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

export function TrackOrderPage() {
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<(Order & { items?: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase.rpc('lookup_order_by_number_or_phone', { query: query.trim() });
    if (error || !data) {
      setOrders([]);
    } else {
      const rows = data as Order[];
      // fetch items for each
      const withItems = await Promise.all(
        rows.map(async (o) => {
          const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
          return { ...o, items: (items as OrderItem[]) || [] };
        })
      );
      setOrders(withItems);
    }
    setLoading(false);
  };

  const currentIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_ORDER.indexOf(status);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="font-display text-4xl text-ink-50 sm:text-5xl">Track Your Order</h1>
        <p className="mt-2 text-ink-300">Enter your Order ID (e.g. DG-251018-12345) or the phone number used at checkout.</p>
      </motion.div>

      <form onSubmit={search} className="mx-auto mt-8 flex max-w-xl gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order ID or phone number" className="input-glass pl-10" />
        </div>
        <button type="submit" disabled={loading} className="btn-gold px-6 disabled:opacity-50">{loading ? 'Searching…' : 'Track'}</button>
      </form>

      <div className="mt-8 space-y-4">
        {searched && !loading && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 p-12 text-center">
            <p className="text-ink-300">No orders found. Double-check your Order ID or phone number.</p>
          </div>
        )}

        {orders.map((o) => {
          const idx = currentIndex(o.status);
          const isOpen = expanded === o.id;
          const cancelled = o.status === 'cancelled';
          return (
            <motion.div key={o.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-3d overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : o.id)} className="flex w-full items-center justify-between p-5 text-left">
                <div>
                  <p className="font-mono text-sm font-semibold text-gold-300">{o.order_number}</p>
                  <p className="text-xs text-ink-400">{new Date(o.created_at).toLocaleString()} · {o.items?.length || 0} items · {formatMoney(Number(o.total_bdt), 'BDT', settings)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`chip ${cancelled ? 'border-danger/40 text-danger' : 'border-accent-500/40 text-accent-300'}`}>
                    {cancelled && <XCircle size={11} />} {o.status}
                  </span>
                  <ChevronRight size={16} className={`text-ink-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/10 p-5">
                  {/* Progress steps */}
                  {!cancelled ? (
                    <div className="relative mb-6 flex justify-between">
                      <div className="absolute left-0 top-5 mx-8 h-0.5 bg-white/10" />
                      <div
                        className="absolute left-0 top-5 mx-8 h-0.5 bg-gold-sheen transition-all"
                        style={{ width: idx <= 0 ? 0 : `calc(${(idx / (STEPS.length - 1)) * 100}% - 2rem)` }}
                      />
                      {STEPS.map((s, i) => {
                        const done = i <= idx;
                        return (
                          <div key={s.id} className="relative z-10 flex flex-1 flex-col items-center">
                            <div className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-all ${done ? 'border-gold-400 bg-gold-sheen text-ink-950' : 'border-white/15 bg-ink-900 text-ink-500'}`}>
                              <s.icon size={16} />
                            </div>
                            <span className={`mt-2 text-[11px] ${done ? 'text-gold-300' : 'text-ink-400'}`}>{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-danger/15 py-4 text-danger">
                      <XCircle size={18} /> This order was cancelled.
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-3">
                    {o.items?.map((it) => (
                      <div key={it.id} className="flex items-center gap-3">
                        {it.image_url && <img src={it.image_url} alt={it.name} className="h-12 w-12 rounded-lg object-cover" />}
                        <div className="flex-1">
                          <p className="text-sm text-ink-100">{it.name}</p>
                          <p className="text-xs text-ink-400">{[it.color, it.size].filter(Boolean).join(' · ')} · Qty {it.quantity}</p>
                        </div>
                        <p className="text-sm text-ink-200">{formatMoney(Number(it.line_total_bdt), 'BDT', settings)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-400">Shipping To</p>
                      <p className="text-ink-100">{o.customer_name}</p>
                      <p className="text-ink-300">{o.shipping_address}</p>
                      <p className="text-ink-300">{o.customer_phone}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wider text-ink-400">Payment</p>
                      <p className="text-ink-100 uppercase">{o.payment_method}</p>
                      <p className="text-ink-300">{o.payment_status}</p>
                      <p className="mt-1 font-semibold text-gold-300">{formatMoney(Number(o.total_bdt), 'BDT', settings)}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Link to="/shop" className="btn-ghost">Back to Shop</Link>
      </div>
    </div>
  );
}
