import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Copy, ShoppingBag, Truck, Wallet, CreditCard, Banknote, Bitcoin, ShieldCheck, Tag, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, convertBdtToUsd } from '@/lib/format';
import { trackPurchase, trackInitiateCheckout } from '@/lib/tracking';
import { supabase } from '@/lib/supabase';
import type { PaymentMethod } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

export function CheckoutPage() {
  const { items, subtotalBdt, shippingBdt, totalBdt, couponCode, couponDiscountBdt, clear, currency } = useCart();
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    address: '',
    city: '',
    notes: '',
  });
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderNumber: string; binance?: boolean } | null>(null);
  const [binanceOpen, setBinanceOpen] = useState(false);
  const [binanceTxid, setBinanceTxid] = useState('');
  const [trxid, setTrxid] = useState('');
  const [copied, setCopied] = useState<'payid' | 'wallet' | 'bkash' | 'nagad' | 'rocket' | null>(null);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', holder: '' });
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const payments: { id: PaymentMethod; label: string; icon: typeof Wallet; available: boolean }[] = [
    { id: 'cod', label: 'Cash on Delivery', icon: Banknote, available: true },
    { id: 'bkash', label: 'bKash', icon: Wallet, available: true },
    { id: 'nagad', label: 'Nagad', icon: Wallet, available: true },
    { id: 'rocket', label: 'Rocket', icon: Wallet, available: true },
    { id: 'card', label: 'Card', icon: CreditCard, available: true },
    { id: 'binance', label: 'Binance Pay / USDT', icon: Bitcoin, available: true },
  ];
  const needsTrxid = payment === 'bkash' || payment === 'nagad' || payment === 'rocket';
  const activePayments = payments;

  const walletNumber = (method: PaymentMethod): string | null => {
    if (method === 'bkash') return settings?.bkash_number || null;
    if (method === 'nagad') return settings?.nagad_number || null;
    if (method === 'rocket') return settings?.rocket_number || null;
    return null;
  };
  const walletLabel = (method: PaymentMethod): string => {
    if (method === 'bkash') return 'bKash';
    if (method === 'nagad') return 'Nagad';
    if (method === 'rocket') return 'Rocket';
    return '';
  };

  const copy = (text: string, kind: 'payid' | 'wallet' | 'bkash' | 'nagad' | 'rocket') => {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const sendOtp = async () => {
    setOtpError('');
    if (!form.phone || form.phone.length < 11) { setOtpError('Enter a valid phone number first.'); return; }
    setOtpSending(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpSent(code);
    setOtpVerified(false);
    setOtpCode('');
    setOtpOpen(true);
    setOtpSending(false);
  };

  const verifyOtp = () => {
    setOtpError('');
    if (otpCode === otpSent && otpSent) {
      setOtpVerified(true);
      setOtpOpen(false);
    } else {
      setOtpError('Incorrect OTP code. Please try again.');
    }
  };

  const placeOrder = async (withBinanceTxid?: string) => {
    setError(null);
    if (!form.name || !form.phone || !form.address) {
      setError('Please fill name, phone, and shipping address.');
      return;
    }
    if (needsTrxid && !trxid.trim()) {
      setError(`Please enter your ${payment === 'bkash' ? 'bKash' : payment === 'nagad' ? 'Nagad' : 'Rocket'} Transaction ID (TrxID).`);
      return;
    }
    if (payment === 'cod' && !otpVerified) {
      setOtpOpen(true);
      return;
    }
    if (payment === 'card') {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.holder) {
        setError('Please fill in all card details.');
        return;
      }
      if (cardDetails.number.replace(/\s/g, '').length < 12) {
        setError('Please enter a valid card number.');
        return;
      }
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setLoading(true);

    const { data: orderNum } = await supabase.rpc('generate_order_number');
    const orderNumber = orderNum as string;

    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id || null,
        customer_name: form.name,
        customer_email: form.email || null,
        customer_phone: form.phone,
        shipping_address: form.address,
        city: form.city || null,
        subtotal_bdt: subtotalBdt,
        discount_bdt: couponDiscountBdt,
        shipping_bdt: shippingBdt,
        total_bdt: totalBdt,
        payment_method: payment,
        payment_status: payment === 'cod' ? 'unpaid' : withBinanceTxid ? 'pending' : 'pending',
        binance_txid: withBinanceTxid || null,
        trxid: (payment === 'bkash' || payment === 'nagad' || payment === 'rocket') ? trxid.trim() || null : null,
        coupon_code: couponCode,
        status: 'pending',
        notes: form.notes || null,
      })
      .select()
      .single();

    if (orderErr || !orderRow) {
      setError(orderErr?.message || 'Failed to place order. Please try again.');
      setLoading(false);
      return;
    }

    const orderItems = items.map((i) => ({
      order_id: orderRow.id,
      product_id: i.id,
      name: i.name,
      image_url: i.image,
      size: i.size,
      color: i.color,
      unit_price_bdt: i.price_bdt,
      quantity: i.quantity,
      line_total_bdt: i.price_bdt * i.quantity,
    }));
    await supabase.from('order_items').insert(orderItems);

    if (couponCode) {
      const { data: coupon } = await supabase.from('coupons').select('id').eq('code', couponCode).maybeSingle();
      if (coupon) {
        await supabase.from('coupon_usages').insert({ coupon_id: coupon.id, order_id: orderRow.id, code: couponCode });
        await supabase.rpc('increment_coupon_used', { code: couponCode }).then(({ error }) => { if (error) console.warn('coupon inc', error.message); });
      }
    }

    trackPurchase({
      id: orderRow.id,
      order_number: orderNumber,
      total: totalBdt,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price_bdt, quantity: i.quantity })),
    });

    clear();
    setLoading(false);
    setSuccess({ orderNumber, binance: payment === 'binance' && !withBinanceTxid });
    if (withBinanceTxid || payment !== 'binance') {
      navigate(`/order/${orderNumber}`);
    }
  };

  const handleBinanceConfirm = () => {
    if (!binanceTxid.trim()) {
      setError('Please enter your Binance Transaction ID.');
      return;
    }
    setBinanceOpen(false);
    placeOrder(binanceTxid.trim());
  };

  if (success?.binance) {
    return <BinanceInstructions orderNumber={success.orderNumber} settings={settings} totalBdt={totalBdt} onConfirm={() => setBinanceOpen(true)} />;
  }

  if (items.length === 0 && !success) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <ShoppingBag size={40} className="mx-auto mb-4 text-ink-500" />
        <h1 className="font-display text-3xl text-ink-50">Your cart is empty</h1>
        <Link to="/shop" className="btn-gold mt-6 inline-flex">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-gold-300"><ArrowLeft size={14} /> Continue Shopping</Link>
      <h1 className="mb-8 font-display text-4xl text-ink-50">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-3d p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl"><Truck size={18} className="text-gold-400" /> Shipping Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-glass" required />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Phone *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-glass" required />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-glass" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-glass" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Shipping Address *</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-glass min-h-20 resize-none" required />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Order Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-glass" placeholder="Delivery instructions…" />
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-3d p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl"><Wallet size={18} className="text-gold-400" /> Payment Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {activePayments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${payment === p.id ? 'border-gold-400 bg-gold-400/10' : 'border-white/10 hover:border-white/25'}`}
                >
                  <p.icon size={18} className={payment === p.id ? 'text-gold-300' : 'text-ink-300'} />
                  <span className="flex-1 text-sm font-medium text-ink-100">{p.label}</span>
                  {payment === p.id && <Check size={16} className="text-gold-300" />}
                </button>
              ))}
            </div>

            {needsTrxid && (
              <WalletPaymentBox
                method={payment}
                number={walletNumber(payment)}
                label={walletLabel(payment)}
                instructions={
                  (payment === 'bkash' ? settings?.bkash_instructions :
                  payment === 'nagad' ? settings?.nagad_instructions :
                  settings?.rocket_instructions) ?? null
                }
                amount={formatMoney(totalBdt, currency, settings)}
                trxid={trxid}
                setTrxid={setTrxid}
                copied={copied === payment}
                onCopy={(text) => copy(text, payment)}
              />
            )}
            {payment === 'card' && (
              <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-ink-100"><CreditCard size={14} /> {settings?.card_gateway_name ? `${settings.card_gateway_name} Card Payment` : 'Card Payment'}</p>
                {settings?.card_payment_url && (
                  <p className="rounded-xl bg-gold-400/10 px-3 py-2 text-xs text-gold-200">You'll be redirected to {settings.card_gateway_name || 'the payment gateway'} to complete payment securely.</p>
                )}
                <div className="grid gap-3">
                  <div><label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Cardholder Name</label><input value={cardDetails.holder} onChange={(e) => setCardDetails({ ...cardDetails, holder: e.target.value })} className="input-glass" placeholder="John Doe" /></div>
                  <div><label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Card Number</label><input value={cardDetails.number} onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/[^\d ]/g, '') })} className="input-glass font-mono" placeholder="4242 4242 4242 4242" maxLength={19} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Expiry (MM/YY)</label><input value={cardDetails.expiry} onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) })} className="input-glass font-mono" placeholder="12/28" /></div>
                    <div><label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">CVC</label><input value={cardDetails.cvc} onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="input-glass font-mono" placeholder="123" /></div>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-ink-400"><ShieldCheck size={11} className="text-accent-400" /> Your card details are encrypted and processed securely.</p>
              </div>
            )}
            {payment === 'cod' && (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-ink-200">
                <p className="flex items-center gap-1.5 font-semibold"><Banknote size={14} /> Cash on Delivery</p>
                <p className="mt-1">{settings?.cod_instructions || 'Pay in cash when your order is delivered to your doorstep. Please have the exact amount ready.'}</p>
                {!otpVerified ? (
                  <button onClick={sendOtp} disabled={otpSending || !form.phone} className="btn-gold px-4 py-2 text-xs">
                    {otpSending ? 'Sending…' : <>Verify Phone (OTP) <ShieldCheck size={12} /></>}
                  </button>
                ) : (
                  <p className="flex items-center gap-1.5 rounded-xl bg-accent-500/15 px-3 py-2 text-accent-300"><CheckCircle2 size={14} /> Phone verified — you can place your order.</p>
                )}
              </div>
            )}
            {payment === 'binance' && (
              <div className="mt-4 rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-gold-200">
                <p className="flex items-center gap-1.5 font-semibold"><Bitcoin size={14} /> Binance Pay / USDT</p>
                <p className="mt-2">Total in USD: <span className="font-semibold text-gold-100">${convertBdtToUsd(totalBdt, Number(settings?.bdt_to_usd_rate) || 120).toFixed(2)}</span> (rate 1 USD = ৳{Number(settings?.bdt_to_usd_rate) || 120})</p>
                <p className="mt-1 text-xs text-gold-300/80">After placing the order you'll see the Binance Pay ID / USDT wallet + QR to complete payment.</p>
              </div>
            )}
          </motion.section>
        </div>

        {/* Summary */}
        <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-3d p-6">
            <h2 className="mb-4 font-display text-xl">Order Summary</h2>
            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto scrollbar-thin">
              {items.map((i) => (
                <div key={i.lineKey} className="flex gap-3">
                  <div className="relative">
                    <img src={i.image} alt={i.name} className="h-14 w-14 rounded-xl object-cover" />
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-sheen px-1 text-[10px] font-bold text-ink-950">{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-100">{i.name}</p>
                    <p className="text-xs text-ink-400">{[i.color, i.size].filter(Boolean).join(' · ')}</p>
                  </div>
                  <p className="text-sm font-medium text-ink-100">{formatMoney(i.price_bdt * i.quantity, currency, settings)}</p>
                </div>
              ))}
            </div>
            {couponCode && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-accent-500/15 px-3 py-2 text-xs text-accent-300">
                <span className="flex items-center gap-1.5"><Tag size={12} /> {couponCode}</span>
                <span>−{formatMoney(couponDiscountBdt, currency, settings)}</span>
              </div>
            )}
            <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
              <div className="flex justify-between text-ink-300"><span>Subtotal</span><span>{formatMoney(subtotalBdt, currency, settings)}</span></div>
              {couponDiscountBdt > 0 && <div className="flex justify-between text-accent-300"><span>Discount</span><span>−{formatMoney(couponDiscountBdt, currency, settings)}</span></div>}
              <div className="flex justify-between text-ink-300"><span>Shipping</span><span>{shippingBdt === 0 ? 'FREE' : formatMoney(shippingBdt, currency, settings)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-display text-lg font-semibold text-ink-50"><span>Total</span><span className="text-gold-300">{formatMoney(totalBdt, currency, settings)}</span></div>
            </div>
            {error && <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
            <button
              onClick={() => {
                trackInitiateCheckout({ total: totalBdt, items: items.map((i) => ({ id: i.id, name: i.name, price: i.price_bdt, quantity: i.quantity })) });
                placeOrder();
              }}
              disabled={loading}
              className="btn-gold mt-4 w-full"
            >
              {loading ? 'Placing Order…' : <>Place Order <ArrowRight size={15} /></>}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400"><ShieldCheck size={12} className="text-accent-400" /> Secured by Supabase RLS</p>
          </div>
        </motion.aside>
      </div>

      <Modal open={binanceOpen} onClose={() => setBinanceOpen(false)} title="Confirm Binance Payment" size="md">
        <div className="p-6 space-y-4">
          <p className="text-sm text-ink-200">After you send the USDT/Binance Pay transfer, paste your Binance Transaction ID (TxID) below so we can verify your payment.</p>
          {settings?.binance_pay_id && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
              <div><p className="text-xs text-ink-400">Binance Pay ID</p><p className="font-mono text-sm text-ink-100">{settings.binance_pay_id}</p></div>
              <button onClick={() => copy(settings.binance_pay_id!, 'payid')} className="btn-ghost px-3 py-1.5 text-xs">{copied === 'payid' ? <Check size={12} /> : <Copy size={12} />} Copy</button>
            </div>
          )}
          {settings?.usdt_wallet_address && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
              <div className="min-w-0"><p className="text-xs text-ink-400">USDT (TRC20)</p><p className="truncate font-mono text-sm text-ink-100">{settings.usdt_wallet_address}</p></div>
              <button onClick={() => copy(settings.usdt_wallet_address!, 'wallet')} className="btn-ghost px-3 py-1.5 text-xs">{copied === 'wallet' ? <Check size={12} /> : <Copy size={12} />} Copy</button>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Binance Transaction ID (TxID) *</label>
            <input value={binanceTxid} onChange={(e) => setBinanceTxid(e.target.value)} className="input-glass" placeholder="e.g. 384920582347…" />
          </div>
          <button onClick={handleBinanceConfirm} className="btn-gold w-full">Confirm & Place Order</button>
        </div>
      </Modal>

      <Modal open={otpOpen} onClose={() => setOtpOpen(false)} title="Verify Your Phone (COD)" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-ink-200">A 4-digit verification code has been sent to <span className="font-semibold text-ink-50">{form.phone}</span>. Enter it below to confirm your Cash on Delivery order.</p>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">OTP Code</label>
            <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))} className="input-glass text-center font-mono text-2xl tracking-[0.5em]" placeholder="••••" maxLength={4} />
          </div>
          {otpError && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{otpError}</p>}
          <div className="flex gap-2">
            <button onClick={verifyOtp} disabled={otpCode.length < 4} className="btn-gold flex-1">Verify & Continue</button>
            <button onClick={() => { setOtpOpen(false); }} className="btn-ghost">Cancel</button>
          </div>
          <button onClick={sendOtp} className="w-full text-center text-xs text-ink-400 hover:text-gold-300">Resend OTP</button>
        </div>
      </Modal>
    </div>
  );
}

function WalletPaymentBox({
  method,
  number,
  label,
  instructions,
  amount,
  trxid,
  setTrxid,
  copied,
  onCopy,
}: {
  method: PaymentMethod;
  number: string | null;
  label: string;
  instructions: string | null;
  amount: string;
  trxid: string;
  setTrxid: (v: string) => void;
  copied: boolean;
  onCopy: (text: string) => void;
}) {
  const defaultInstruction = `Send money to our ${label} number below, then enter the TrxID. Amount: ${amount}`;
  const placeholder = method === 'bkash' ? 'e.g. 8N7D5XKZAB' : method === 'nagad' ? 'e.g. NAGD5XKZAB' : 'e.g. RKT5XKZAB';

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-accent-500/10 p-4 text-sm text-accent-200">
      <p>{instructions || (number ? defaultInstruction : `Send money to our ${label} number (contact us for the number), then enter the TrxID below. Amount: ${amount}`)}</p>
      {number && (
        <div className="flex items-center justify-between rounded-xl border border-accent-500/30 bg-ink-950/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-accent-400">{label} Number</p>
            <p className="font-mono text-lg font-semibold text-ink-50">{number}</p>
          </div>
          <button onClick={() => onCopy(number)} className="btn-gold px-3 py-1.5 text-xs">
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">{label} Transaction ID (TrxID) *</label>
        <input value={trxid} onChange={(e) => setTrxid(e.target.value)} className="input-glass font-mono" placeholder={placeholder} />
      </div>
    </div>
  );
}

function BinanceInstructions({ orderNumber, settings, totalBdt, onConfirm }: { orderNumber: string; settings: any; totalBdt: number; onConfirm: () => void }) {
  const [copied, setCopied] = useState<'payid' | 'wallet' | null>(null);
  const usdTotal = convertBdtToUsd(totalBdt, Number(settings?.bdt_to_usd_rate) || 120);
  const copy = (text: string, kind: 'payid' | 'wallet') => { navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-3d overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-br from-gold-400/15 to-transparent p-6 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-gold-300" />
          <h1 className="font-display text-3xl text-ink-50">Order Placed!</h1>
          <p className="mt-1 text-sm text-ink-300">Order <span className="font-mono font-semibold text-gold-300">{orderNumber}</span></p>
        </div>
        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-gold-400">Amount to pay (USDT)</p>
            <p className="font-display text-4xl font-semibold text-gold-200">${usdTotal.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gold-300/80">≈ ৳{totalBdt.toLocaleString()} BDT</p>
          </div>

          {settings?.binance_pay_id && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div><p className="text-xs text-ink-400">Binance Pay ID</p><p className="font-mono text-sm text-ink-100">{settings.binance_pay_id}</p></div>
              <button onClick={() => copy(settings.binance_pay_id, 'payid')} className="btn-ghost px-3 py-2 text-xs">{copied === 'payid' ? <Check size={12} /> : <Copy size={12} />} Copy</button>
            </div>
          )}
          {settings?.usdt_wallet_address && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="min-w-0"><p className="text-xs text-ink-400">USDT Wallet (TRC20)</p><p className="truncate font-mono text-sm text-ink-100">{settings.usdt_wallet_address}</p></div>
              <button onClick={() => copy(settings.usdt_wallet_address, 'wallet')} className="btn-ghost px-3 py-2 text-xs">{copied === 'wallet' ? <Check size={12} /> : <Copy size={12} />} Copy</button>
            </div>
          )}
          {settings?.binance_qr_url && (
            <div className="flex justify-center rounded-2xl border border-white/10 bg-white p-3">
              <img src={settings.binance_qr_url} alt="Binance QR" className="h-48 w-48" />
            </div>
          )}
          <p className="text-center text-xs text-ink-400">After sending the payment, click below to submit your Transaction ID for verification.</p>
          <button onClick={onConfirm} className="btn-gold w-full">I've Paid — Enter TxID</button>
          <Link to={`/order/${orderNumber}`} className="block text-center text-sm text-ink-300 hover:text-gold-300">View order status</Link>
        </div>
      </motion.div>
    </div>
  );
}
