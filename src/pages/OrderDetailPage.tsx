import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Package, Truck, Home, XCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/format';
import { trackPurchase } from '@/lib/tracking';
import type { Order, OrderItem } from '@/lib/types';

const STEPS = [
  { id: 'pending', label: 'Order Placed', icon: Clock, desc: 'We received your order.' },
  { id: 'processing', label: 'Processing', icon: Package, desc: 'Preparing your items.' },
  { id: 'shipped', label: 'Shipped', icon: Truck, desc: 'On the way to you.' },
  { id: 'delivered', label: 'Delivered', icon: Home, desc: 'Enjoy your purchase!' },
] as const;
const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const firedPurchase = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle()
      .then(({ data }) => {
        const o = data as Order | null;
        setOrder(o);
        if (o) {
          supabase.from('order_items').select('*').eq('order_id', o.id).then(({ data: its }) => {
            const orderItems = (its as OrderItem[]) || [];
            setItems(orderItems);
            // Fire purchase event once on the thank-you page
            if (o.payment_status !== 'paid' || o.status === 'pending') {
              if (firedPurchase.current !== o.order_number) {
                firedPurchase.current = o.order_number;
                trackPurchase({
                  id: o.id,
                  order_number: o.order_number,
                  total: Number(o.total_bdt),
                  shipping: Number(o.shipping_bdt),
                  tax: 0,
                  items: orderItems.map((it) => ({
                    id: it.product_id || it.id,
                    name: it.name,
                    price: Number(it.unit_price_bdt),
                    quantity: it.quantity,
                  })),
                });
              }
            }
          });
        }
        setLoading(false);
      });
  }, [orderNumber]);

  if (loading) return <div className="px-4 py-32 text-center text-ink-400">Loading order…</div>;
  if (!order) return (
    <div className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-display text-3xl text-ink-50">Order not found</h1>
      <Link to="/track-order" className="btn-gold mt-6 inline-flex">Track Another Order</Link>
    </div>
  );

  const idx = order.status === 'cancelled' ? -1 : STATUS_ORDER.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/track-order" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-gold-300"><ArrowLeft size={14} /> Back to Tracking</Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-3d overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-br from-gold-400/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gold-400">Order</p>
              <h1 className="font-mono text-2xl font-semibold text-ink-50">{order.order_number}</h1>
            </div>
            <span className={`chip ${cancelled ? 'border-danger/40 text-danger' : 'border-accent-500/40 text-accent-300'}`}>{order.status}</span>
          </div>
          <p className="mt-2 text-sm text-ink-400">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>

        <div className="p-6">
          {/* Progress */}
          {!cancelled ? (
            <div className="mb-8">
              <div className="relative flex justify-between">
                <div className="absolute left-0 right-0 top-5 mx-6 h-0.5 bg-white/10" />
                <div className="absolute left-0 top-5 mx-6 h-0.5 bg-gold-sheen transition-all" style={{ width: idx <= 0 ? 0 : `calc(${(idx / (STEPS.length - 1)) * 100}% - 1.5rem)` }} />
                {STEPS.map((s, i) => {
                  const done = i <= idx;
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative z-10 flex flex-1 flex-col items-center text-center">
                      <div className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-all ${done ? 'border-gold-400 bg-gold-sheen text-ink-950 shadow-gold-glow' : 'border-white/15 bg-ink-900 text-ink-500'}`}>
                        <s.icon size={16} />
                      </div>
                      <span className={`mt-2 text-[11px] font-semibold ${done ? 'text-gold-300' : 'text-ink-400'}`}>{s.label}</span>
                      <span className="text-[10px] text-ink-500">{s.desc}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-danger/15 py-5 text-danger"><XCircle size={20} /> This order was cancelled.</div>
          )}

          {/* Items */}
          <h2 className="mb-3 font-display text-xl">Items</h2>
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                {it.image_url && <img src={it.image_url} alt={it.name} className="h-14 w-14 rounded-xl object-cover" />}
                <div className="flex-1">
                  <p className="text-sm text-ink-100">{it.name}</p>
                  <p className="text-xs text-ink-400">{[it.color, it.size].filter(Boolean).join(' · ')} · Qty {it.quantity}</p>
                </div>
                <p className="text-sm text-ink-200">{formatMoney(Number(it.line_total_bdt), 'BDT', settings)}</p>
              </div>
            ))}
          </div>

          {/* Totals + info */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-white/10 p-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">Shipping</p>
              <p className="text-ink-100">{order.customer_name}</p>
              <p className="text-ink-300">{order.shipping_address}</p>
              <p className="text-ink-300">{order.district ? `${order.district}, ` : ''}{order.city}, {order.country}</p>
              <p className="text-ink-300">{order.customer_phone}</p>
              {order.customer_email && <p className="text-ink-300">{order.customer_email}</p>}
            </div>
            <div className="space-y-2 rounded-2xl border border-white/10 p-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">Payment & Totals</p>
              <div className="flex justify-between text-ink-300"><span>Method</span><span className="uppercase text-ink-100">{order.payment_method}</span></div>
              <div className="flex justify-between text-ink-300"><span>Payment status</span><span className="text-ink-100">{order.payment_status}</span></div>
              {order.trxid && <div className="flex justify-between text-ink-300"><span>TrxID</span><span className="font-mono text-xs text-accent-300">{order.trxid}</span></div>}
              {order.binance_txid && <div className="flex justify-between text-ink-300"><span>Binance TxID</span><span className="font-mono text-xs text-gold-300">{order.binance_txid}</span></div>}
              {order.courier_tracking && (
                <div className="flex justify-between text-ink-300"><span>Courier</span><span className="text-ink-100">{order.courier_name || 'Courier'} · <span className="font-mono text-xs text-gold-300">{order.courier_tracking}</span></span></div>
              )}
              <div className="flex justify-between text-ink-300"><span>Subtotal</span><span>{formatMoney(Number(order.subtotal_bdt), 'BDT', settings)}</span></div>
              {Number(order.discount_bdt) > 0 && <div className="flex justify-between text-accent-300"><span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span><span>−{formatMoney(Number(order.discount_bdt), 'BDT', settings)}</span></div>}
              <div className="flex justify-between text-ink-300"><span>Shipping</span><span>{Number(order.shipping_bdt) === 0 ? 'FREE' : formatMoney(Number(order.shipping_bdt), 'BDT', settings)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-display text-lg font-semibold text-ink-50"><span>Total</span><span className="text-gold-300">{formatMoney(Number(order.total_bdt), 'BDT', settings)}</span></div>
            </div>
          </div>

          {order.status === 'delivered' && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-accent-500/15 py-4 text-accent-300">
              <CheckCircle2 size={18} /> Delivered. We hope you love your purchase!
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
