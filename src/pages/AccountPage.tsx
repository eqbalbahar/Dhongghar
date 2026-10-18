import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User as UserIcon, Package, LogOut, Mail, Phone, MapPin, ShoppingBag, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import type { Order, OrderItem } from '@/lib/types';
import { StarRating } from '@/components/ui/StarRating';

export function AccountPage() {
  const { user, profile, isAdmin, signOut, refreshProfile, loading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<(Order & { items?: OrderItem[] })[]>([]);
  const [tab, setTab] = useState<'profile' | 'orders'>('profile');
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    setEditName(profile?.full_name || '');
    setEditPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as Order[]) || [];
          Promise.all(
            rows.map(async (o) => {
              const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
              return { ...o, items: (items as OrderItem[]) || [] };
            })
          ).then(setOrders);
        });
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('profiles').update({ full_name: editName, phone: editPhone }).eq('id', user!.id);
    if (error) setMsg(error.message);
    else {
      await refreshProfile();
      setMsg('Profile updated.');
    }
    setSaving(false);
  };

  if (loading) return <div className="px-4 py-32 text-center text-ink-400">Loading…</div>;

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-sheen font-display text-2xl font-bold text-ink-950">
          {(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-3xl text-ink-50">{profile?.full_name || 'Welcome'}</h1>
          <p className="text-sm text-ink-400">{user.email} · <span className="uppercase text-gold-400">{profile?.role}</span></p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1.5">
          <button onClick={() => setTab('profile')} className={`flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-all ${tab === 'profile' ? 'bg-gold-sheen text-ink-950' : 'text-ink-200 hover:bg-white/5'}`}><UserIcon size={16} /> Profile</button>
          <button onClick={() => setTab('orders')} className={`flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-all ${tab === 'orders' ? 'bg-gold-sheen text-ink-950' : 'text-ink-200 hover:bg-white/5'}`}><Package size={16} /> My Orders ({orders.length})</button>
          <Link to="/track-order" className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm text-ink-200 hover:bg-white/5"><ShoppingBag size={16} /> Track Order</Link>
          <button onClick={() => { signOut(); navigate('/'); }} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger hover:bg-danger/10"><LogOut size={16} /> Sign Out</button>
        </aside>

        <div className="space-y-4">
          {tab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-3d p-6">
              <h2 className="mb-5 font-display text-2xl">Profile Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Full Name</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-glass" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Phone</label>
                  <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="input-glass" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Email</label>
                  <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={user.email || ''} disabled className="input-glass pl-9 opacity-60" /></div>
                </div>
              </div>
              {msg && <p className={`mt-3 text-sm ${msg.includes('updated') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
              <button onClick={saveProfile} disabled={saving} className="btn-gold mt-4">{saving ? 'Saving…' : 'Save Changes'}</button>
            </motion.div>
          )}

          {tab === 'orders' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {orders.length === 0 ? (
                <div className="card-3d p-12 text-center">
                  <Package size={36} className="mx-auto mb-3 text-ink-500" />
                  <p className="text-ink-300">You haven't placed any orders yet.</p>
                  <Link to="/shop" className="btn-gold mt-4 inline-flex">Start Shopping</Link>
                </div>
              ) : (
                orders.map((o) => (
                  <Link to={`/order/${o.order_number}`} key={o.id} className="card-3d flex items-center justify-between p-5 hover:border-gold-400/40">
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04]"><Package size={18} className="text-gold-400" /></div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-gold-300">{o.order_number}</p>
                        <p className="text-xs text-ink-400">{new Date(o.created_at).toLocaleDateString()} · {o.items?.length || 0} items</p>
                        <span className={`chip mt-1 ${o.status === 'delivered' ? 'border-accent-500/40 text-accent-300' : o.status === 'cancelled' ? 'border-danger/40 text-danger' : 'border-gold-400/40 text-gold-300'}`}>{o.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink-50">{formatMoney(Number(o.total_bdt), 'BDT', settings)}</p>
                      <ChevronRight size={16} className="ml-auto mt-1 text-ink-400" />
                    </div>
                  </Link>
                ))
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
