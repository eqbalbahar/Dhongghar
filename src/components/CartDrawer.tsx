import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/format';
import { trackInitiateCheckout } from '@/lib/tracking';
import { useState } from 'react';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, updateQty, remove, subtotalBdt, totalBdt, shippingBdt, currency, couponCode, removeCoupon, applyCoupon } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleApply = async () => {
    if (!couponInput.trim()) return;
    const res = await applyCoupon(couponInput, subtotalBdt);
    if (res.error) {
      setCouponMsg({ ok: false, text: res.error });
    } else {
      setCouponMsg({ ok: true, text: `Saved ${formatMoney(res.discount, currency, settings)}!` });
    }
  };

  const goCheckout = () => {
    onClose();
    trackInitiateCheckout({
      total: totalBdt,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price_bdt, quantity: i.quantity })),
    });
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="glass-strong absolute right-0 top-0 flex h-full w-full max-w-md flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="flex items-center gap-2 font-display text-xl"><ShoppingBag size={18} className="text-gold-400" /> Your Cart</h3>
              <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-white/5"><ShoppingBag size={32} className="text-ink-400" /></div>
                <p className="text-ink-300">Your cart is empty</p>
                <Link to="/shop" onClick={onClose} className="btn-gold">Start Shopping</Link>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                  {items.map((i) => (
                    <motion.div
                      key={i.lineKey}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="glass-soft flex gap-3 rounded-2xl p-3"
                    >
                      <img src={i.image} alt={i.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <p className="line-clamp-1 text-sm font-medium text-ink-50">{i.name}</p>
                          <button onClick={() => remove(i.lineKey)} className="text-ink-400 hover:text-danger"><Trash2 size={14} /></button>
                        </div>
                        <p className="text-xs text-ink-400">{[i.color, i.size].filter(Boolean).join(' · ')}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-1">
                            <button onClick={() => updateQty(i.lineKey, i.quantity - 1)} className="p-1 text-ink-300 hover:text-ink-50"><Minus size={12} /></button>
                            <span className="w-6 text-center text-sm">{i.quantity}</span>
                            <button onClick={() => updateQty(i.lineKey, i.quantity + 1)} className="p-1 text-ink-300 hover:text-ink-50"><Plus size={12} /></button>
                          </div>
                          <p className="text-sm font-semibold text-gold-300">{formatMoney(i.price_bdt * i.quantity, currency, settings)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="border-t border-white/10 px-4 py-3">
                  {couponCode ? (
                    <div className="flex items-center justify-between rounded-xl bg-accent-500/15 px-3 py-2 text-sm">
                      <span className="flex items-center gap-1.5 text-accent-300"><Tag size={13} /> {couponCode} applied</span>
                      <button onClick={() => { removeCoupon(); setCouponMsg(null); setCouponInput(''); }} className="text-xs text-ink-400 hover:text-danger">Remove</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="input-glass flex-1 py-2 text-sm" />
                      <button onClick={handleApply} className="btn-ghost px-4 py-2 text-sm">Apply</button>
                    </div>
                  )}
                  {couponMsg && <p className={`mt-1.5 text-xs ${couponMsg.ok ? 'text-accent-300' : 'text-danger'}`}>{couponMsg.text}</p>}
                </div>

                <div className="space-y-2 border-t border-white/10 px-4 py-3 text-sm">
                  <div className="flex justify-between text-ink-300"><span>Subtotal</span><span>{formatMoney(subtotalBdt, currency, settings)}</span></div>
                  <div className="flex justify-between text-ink-300"><span>Shipping</span><span>{shippingBdt === 0 ? 'FREE' : formatMoney(shippingBdt, currency, settings)}</span></div>
                  <div className="flex justify-between font-semibold text-ink-50"><span>Total</span><span className="text-gold-300">{formatMoney(totalBdt, currency, settings)}</span></div>
                </div>
                <div className="p-4">
                  <button onClick={goCheckout} className="btn-gold w-full">Checkout <ArrowRight size={16} /></button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
