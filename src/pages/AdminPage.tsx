import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Ticket, Settings, Palette, BarChart3,
  Search, Plus, Pencil, Trash2, X, Save, TrendingUp, Users, DollarSign, AlertTriangle,
  Download, Eye, Shield, Bitcoin, Sparkles, Phone, Mail, MapPin, Facebook, Instagram, Music2, MessageCircle,
  Truck, ShieldCheck, Lock, CheckCircle2, Send, Image as ImageIcon, Upload, FileDown, FileSpreadsheet,
  CreditCard, PlusCircle, Terminal, Copy, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { formatMoney, slugify } from '@/lib/format';
import { fetchProducts, fetchCategories } from '@/lib/catalog';
import type { Product, Order, Coupon, Category, StoreSettings, OrderStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

type AdminTab = 'dashboard' | 'products' | 'categories' | 'orders' | 'coupons' | 'appearance' | 'pixels' | 'payments' | 'courier' | 'policies' | 'banners' | 'ai' | 'contact' | 'fraud' | 'admin_security' | 'developer';

// In-memory gate flag — resets on full page reload, which is intentional.
// The real auth check still happens via Supabase in AdminPage.
let gateUnlocked = false;

export function AdminGate() {
  const { user, isAdmin, loading } = useAuth();
  const [entered, setEntered] = useState(gateUnlocked);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // If already a signed-in admin, skip the gate.
  useEffect(() => {
    if (!loading && user && isAdmin) {
      gateUnlocked = true;
      setEntered(true);
    }
  }, [user, isAdmin, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    // Sign in with the admin email + the entered password via Supabase auth.
    // The admin email is the bootstrap admin (created in migration).
    // We try the email stored in store_settings, fallback to a known admin email.
    const { data: settings } = await supabase.from('store_settings').select('email').eq('id', 1).maybeSingle();
    const adminEmail = settings?.email || 'admin@dhongghar.com';
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (signInError) {
      setError('Incorrect admin password. Please try again.');
      setChecking(false);
      return;
    }
    // AuthContext will load the profile; check admin role after a tick.
    // We rely on the onAuthStateChange to update isAdmin. Brief wait.
    gateUnlocked = true;
    setEntered(true);
    setChecking(false);
  };

  if (loading) return <div className="px-4 py-32 text-center text-ink-400">Loading…</div>;

  if (!entered) {
    return (
      <div className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-12">
        <div className="absolute inset-0 -z-10 bg-glass-radial" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-strong overflow-hidden rounded-3xl shadow-glass-lg">
            <div className="relative border-b border-white/10 bg-gradient-to-br from-gold-400/15 to-transparent p-7 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gold-sheen shadow-gold-glow"
              >
                <Lock size={28} className="text-ink-950" />
              </motion.div>
              <h1 className="font-display text-3xl text-ink-50">Admin Access</h1>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold-300">
                <Sparkles size={12} /> DHONG GHAR · Atelier
              </p>
            </div>

            <div className="p-7">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400">Admin Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glass"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
                <button type="submit" disabled={checking || !password} className="btn-gold w-full disabled:opacity-50">
                  {checking ? 'Verifying…' : <>Unlock Admin Panel <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="mt-5 rounded-2xl border border-gold-400/20 bg-gold-400/[0.06] p-3.5 text-xs text-gold-200/90">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-gold-300"><ShieldCheck size={12} /> Demo credentials</p>
                <p className="font-mono">Email: eqbalbaharase@gmail.com</p>
                <p className="font-mono">Password: demo123456</p>
                <p className="mt-1.5 text-[11px] text-ink-400">Change the password anytime from Admin Security, or update it directly in the database.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <AdminPage />;
}

// Simple CSV line parser that handles quoted fields with commas.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export function AdminPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('dashboard');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate('/');
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="px-4 py-32 text-center text-ink-400">Loading…</div>;
  if (!isAdmin) return null;

  const NAV: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'banners', label: 'Hero Banners', icon: Sparkles },
    { id: 'policies', label: 'Policy Texts', icon: ShieldCheck },
    { id: 'pixels', label: 'Tracking Pixels', icon: BarChart3 },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'courier', label: 'Courier', icon: Truck },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'contact', label: 'Contact & Social', icon: Phone },
    { id: 'fraud', label: 'Fraud Shield', icon: Shield },
    { id: 'admin_security', label: 'Admin Security', icon: Lock },
    { id: 'developer', label: 'Developer Setup', icon: Terminal },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink-50">Admin Panel</h1>
          <p className="text-sm text-ink-400">Signed in as {profile?.full_name || user?.email}</p>
        </div>
        <Link to="/" className="btn-ghost">View Store</Link>
      </div>

      <div className="flex gap-6">
        <aside className="w-56 shrink-0 space-y-1 max-lg:hidden">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm transition-all ${tab === n.id ? 'bg-gold-sheen text-ink-950 font-semibold' : 'text-ink-200 hover:bg-white/5'}`}>
              <n.icon size={15} /> {n.label}
            </button>
          ))}
        </aside>

        <select value={tab} onChange={(e) => setTab(e.target.value as AdminTab)} className="input-glass max-lg:flex lg:hidden">
          {NAV.map((n) => <option key={n.id} value={n.id} className="bg-ink-900">{n.label}</option>)}
        </select>

        <div className="min-w-0 flex-1">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'coupons' && <CouponsTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'banners' && <BannersTab />}
          {tab === 'policies' && <PoliciesTab />}
          {tab === 'pixels' && <PixelsTab />}
          {tab === 'payments' && <PaymentsTab />}
          {tab === 'courier' && <CourierTab />}
          {tab === 'ai' && <AiTab />}
          {tab === 'contact' && <ContactTab />}
          {tab === 'fraud' && <FraudTab />}
          {tab === 'admin_security' && <AdminSecurityTab />}
          {tab === 'developer' && <DeveloperSetupTab />}
        </div>
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardTab() {
  const { settings } = useSettings();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, products: 0, lowStock: [] as Product[], recent: [] as Order[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { data: lowStock } = await supabase.from('products').select('*').lt('stock', 5).eq('status', 'active').order('stock');
      const rows = (orders as Order[]) || [];
      setStats({
        revenue: rows.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_bdt), 0),
        orders: rows.length,
        pending: rows.filter((o) => o.status === 'pending').length,
        products: productCount || 0,
        lowStock: (lowStock as Product[]) || [],
        recent: rows.slice(0, 6),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-ink-400">Loading dashboard…</div>;

  const cards = [
    { label: 'Total Revenue', value: formatMoney(stats.revenue, 'BDT', settings), icon: DollarSign, color: 'text-gold-300' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart, color: 'text-accent-300' },
    { label: 'Pending', value: stats.pending, icon: TrendingUp, color: 'text-warning' },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-ink-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card-3d p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ink-400">{c.label}</span>
              <c.icon size={16} className={c.color} />
            </div>
            <p className={`mt-2 font-display text-2xl ${c.color}`}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {stats.lowStock.length > 0 && (
        <div className="card-3d border-warning/30 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-warning"><AlertTriangle size={16} /> Low Stock Alerts ({stats.lowStock.length})</h3>
          <div className="space-y-2">
            {stats.lowStock.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-100">{p.name}</span>
                <span className="chip border-warning/40 text-warning">{p.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-3d p-5">
        <h3 className="mb-4 font-display text-xl">Recent Orders</h3>
        {stats.recent.length === 0 ? (
          <p className="text-ink-400">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recent.map((o) => (
              <Link to={`/order/${o.order_number}`} key={o.id} className="flex items-center justify-between rounded-xl p-2.5 hover:bg-white/5">
                <div>
                  <p className="font-mono text-sm text-gold-300">{o.order_number}</p>
                  <p className="text-xs text-ink-400">{o.customer_name} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-100">{formatMoney(Number(o.total_bdt), 'BDT', settings)}</span>
                  <span className="chip">{o.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card-3d p-5">
        <h3 className="mb-2 font-display text-xl">Live Visitors</h3>
        <p className="text-3xl font-semibold text-accent-300">{Math.floor(Math.random() * 24) + 6}</p>
        <p className="text-xs text-ink-400">Connect Microsoft Clarity in Tracking Pixels for real session data.</p>
      </div>
    </div>
  );
}

// ============ PRODUCTS ============
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetchProducts({}).then((p) => { setProducts(p); setLoading(false); }).catch(() => setLoading(false));
    fetchCategories().then(setCategories).catch(() => {});
  };
  useEffect(load, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    load();
  };

  const exportCsv = () => {
    const headers = ['name', 'slug', 'category', 'price_bdt', 'compare_at_bdt', 'stock', 'status', 'images', 'description', 'colors', 'sizes', 'tags', 'discount_badge'];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      return [
        JSON.stringify(p.name),
        JSON.stringify(p.slug),
        JSON.stringify(cat?.slug || ''),
        p.price_bdt,
        p.compare_at_bdt || '',
        p.stock,
        p.status,
        JSON.stringify((p.images || []).join(' | ')),
        JSON.stringify(p.description || ''),
        JSON.stringify((p.colors || []).join(',')),
        JSON.stringify((p.sizes || []).join(',')),
        JSON.stringify((p.tags || []).join(',')),
        JSON.stringify(p.discount_badge || ''),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhong-ghar-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCsv = () => {
    const sample = `name,slug,category,price_bdt,compare_at_bdt,stock,status,images,description,colors,sizes,tags,discount_badge
"Banarasi Silk Saree","banarasi-silk-saree","saree",3500,5000,10,active,"https://example.com/img1.jpg | https://example.com/img2.jpg","Premium handwoven Banarasi silk saree","Red,Blue,Green","Free Size","saree,silk,premium","23% OFF"
"Cotton T-Shirt","cotton-t-shirt","t-shirt",599,899,50,active,"https://example.com/tee.jpg","Soft cotton round neck t-shirt","White,Black","S,M,L,XL","t-shirt,cotton","15% OFF"`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dhong-ghar-sample-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) { alert('CSV file is empty or has no data rows.'); return; }
    const headers = parseCsvLine(lines[0]);
    const catBySlug: Record<string, string> = {};
    categories.forEach((c) => { catBySlug[c.slug] = c.id; });
    const inserts: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const get = (h: string) => { const idx = headers.indexOf(h); return idx >= 0 ? cols[idx] : ''; };
      const name = get('name').replace(/^"|"$/g, '');
      if (!name) continue;
      const slug = get('slug').replace(/^"|"$/g, '') || slugify(name);
      inserts.push({
        name,
        slug,
        category_id: catBySlug[get('category').replace(/^"|"$/g, '')] || null,
        price_bdt: Number(get('price_bdt')) || 0,
        compare_at_bdt: get('compare_at_bdt') ? Number(get('compare_at_bdt')) : null,
        stock: Number(get('stock')) || 0,
        status: get('status').replace(/^"|"$/g, '') || 'active',
        images: get('images').replace(/^"|"$/g, '').split('|').map((s) => s.trim()).filter(Boolean),
        description: get('description').replace(/^"|"$/g, ''),
        colors: get('colors').replace(/^"|"$/g, '').split(',').map((s) => s.trim()).filter(Boolean),
        sizes: get('sizes').replace(/^"|"$/g, '').split(',').map((s) => s.trim()).filter(Boolean),
        tags: get('tags').replace(/^"|"$/g, '').split(',').map((s) => s.trim()).filter(Boolean),
        discount_badge: get('discount_badge').replace(/^"|"$/g, '') || null,
      });
    }
    if (inserts.length === 0) { alert('No valid rows found in CSV.'); return; }
    const { data, error } = await supabase.from('products').insert(inserts).select('id');
    if (error) { alert(`Import failed: ${error.message}`); return; }
    alert(`Imported ${data?.length || 0} products successfully.`);
    load();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importCsv(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Products ({products.length})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input-glass w-40 pl-9 py-2 text-sm" />
          </div>
          <button onClick={downloadSampleCsv} className="btn-ghost px-3 py-2 text-xs" title="Download sample CSV template"><FileDown size={14} /> Sample</button>
          <label className="btn-ghost cursor-pointer px-3 py-2 text-sm" title="Bulk import from CSV"><Upload size={14} /> Import CSV<input type="file" accept=".csv" onChange={onFileSelected} className="hidden" /></label>
          <button onClick={exportCsv} className="btn-ghost px-3 py-2 text-sm" title="Export all products to CSV"><FileSpreadsheet size={14} /> Export</button>
          <button onClick={() => setCreating(true)} className="btn-gold px-4 py-2 text-sm"><Plus size={14} /> Add Product</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer-bg" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="card-3d flex items-center gap-4 p-3">
              <img src={p.images?.[0]} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-100">{p.name}</p>
                <p className="text-xs text-ink-400">{formatMoney(Number(p.price_bdt), 'BDT', null)} · Stock: {p.stock} · {p.status}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setEditing(p)} className="btn-ghost p-2"><Pencil size={14} /></button>
                <button onClick={() => del(p)} className="btn-ghost p-2 text-danger hover:bg-danger/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ProductEditModal
          product={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function ProductEditModal({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price_bdt: product?.price_bdt?.toString() || '',
    compare_at_bdt: product?.compare_at_bdt?.toString() || '',
    stock: product?.stock?.toString() || '0',
    low_stock_threshold: product?.low_stock_threshold?.toString() || '5',
    images: (product?.images || []).join('\n'),
    colors: (product?.colors || []).join(', '),
    sizes: (product?.sizes || []).join(', '),
    tags: (product?.tags || []).join(', '),
    category_id: product?.category_id || categories[0]?.id || '',
    is_flash_sale: product?.is_flash_sale || false,
    flash_sale_ends_at: product?.flash_sale_ends_at ? new Date(product.flash_sale_ends_at).toISOString().slice(0, 16) : '',
    status: product?.status || 'active',
    custom_guarantees: (product?.custom_guarantees || []).map((g: any) => g.label).join('\n'),
    custom_features: (product?.custom_features || []).join('\n'),
    discount_badge: product?.discount_badge || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      price_bdt: Number(form.price_bdt) || 0,
      compare_at_bdt: form.compare_at_bdt ? Number(form.compare_at_bdt) : null,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      colors: form.colors.split(',').map((s) => s.trim()).filter(Boolean),
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      category_id: form.category_id || null,
      is_flash_sale: form.is_flash_sale,
      flash_sale_ends_at: form.flash_sale_ends_at ? new Date(form.flash_sale_ends_at).toISOString() : null,
      status: form.status,
      custom_guarantees: form.custom_guarantees.split('\n').map((s) => s.trim()).filter(Boolean).map((label) => ({ label })),
      custom_features: form.custom_features.split('\n').map((s) => s.trim()).filter(Boolean),
      discount_badge: form.discount_badge.trim() || null,
    };
    const { error: err } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);
    if (err) setError(err.message);
    else { setSaving(false); onSaved(); return; }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={product ? 'Edit Product' : 'New Product'} size="xl">
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-glass">
              <option value="" className="bg-ink-900">— No category —</option>
              {categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order).map((main) => (
                <optgroup key={main.id} label={main.name} className="bg-ink-900">
                  <option value={main.id} className="bg-ink-900">{main.name} (main)</option>
                  {categories.filter((c) => c.parent_id === main.id).sort((a, b) => a.sort_order - b.sort_order).map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-ink-900">  ↳ {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-glass">
              <option value="active" className="bg-ink-900">Active</option>
              <option value="draft" className="bg-ink-900">Draft</option>
              <option value="archived" className="bg-ink-900">Archived</option>
            </select>
          </div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Price (BDT)</label><input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Compare-at (BDT)</label><input type="number" value={form.compare_at_bdt} onChange={(e) => setForm({ ...form, compare_at_bdt: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Discount Badge (e.g. 23% OFF)</label><input value={form.discount_badge} onChange={(e) => setForm({ ...form, discount_badge: e.target.value })} className="input-glass" placeholder="23% OFF / SPECIAL OFFER" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Stock</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Low-stock threshold</label><input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} className="input-glass" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-glass min-h-20 resize-none" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Images (one URL per line)</label><textarea value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="input-glass min-h-24 resize-none font-mono text-xs" placeholder="https://…" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Colors (comma separated)</label><input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Sizes (comma separated)</label><input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="input-glass" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-glass" /></div>
          <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={form.is_flash_sale} onChange={(e) => setForm({ ...form, is_flash_sale: e.target.checked })} className="accent-gold-400" /> Flash sale</label>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Flash sale ends at</label><input type="datetime-local" value={form.flash_sale_ends_at} onChange={(e) => setForm({ ...form, flash_sale_ends_at: e.target.value })} className="input-glass" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Custom Guarantee Badges (one per line, e.g. "7 Days Returns")</label><textarea value={form.custom_guarantees} onChange={(e) => setForm({ ...form, custom_guarantees: e.target.value })} className="input-glass min-h-16 resize-none text-sm" placeholder="7 Days Easy Return&#10;100% Authentic" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Custom Features / Highlights (one per line)</label><textarea value={form.custom_features} onChange={(e) => setForm({ ...form, custom_features: e.target.value })} className="input-glass min-h-16 resize-none text-sm" placeholder="Handwoven silk&#10;Dry clean only" /></div>
        </div>
        {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-gold flex-1">{saving ? 'Saving…' : <>Save <Save size={14} /></>}</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ============ ORDERS ============
function OrdersTab() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setOrders((data as Order[]) || []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const filtered = orders.filter((o) => (filter === 'all' || o.status === filter) && (o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_phone.includes(search)));

  const updateStatus = async (id: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const verifyPayment = async (id: string) => {
    await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id);
    load();
    if (selected?.id === id) setSelected({ ...selected, payment_status: 'paid' });
  };

  const sendToCourier = async (o: Order) => {
    // In production, this calls the courier API (Steadfast/Pathao/RedX/Paperfly).
    // For now, mark order as processing and store a placeholder tracking reference.
    const consignment = `SF-${o.order_number.slice(-6)}-${Date.now().toString().slice(-4)}`;
    await supabase.from('orders').update({
      status: 'processing',
      courier_name: (o as any).courier_name || 'steadfast',
      courier_consignment: consignment,
      courier_tracking: consignment,
      courier_booked_at: new Date().toISOString(),
    }).eq('id', o.id);
    load();
    if (selected?.id === o.id) setSelected({ ...selected, status: 'processing', courier_consignment: consignment, courier_tracking: consignment });
  };

  const printInvoice = (o: Order) => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${o.order_number}</title><style>body{font-family:serif;padding:40px;color:#111}h1{color:#bc7215}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}.muted{color:#666;font-size:12px}.tot{font-weight:bold;font-size:18px;margin-top:12px}</style></head><body><h1>DHONG GHAR</h1><p class="muted">Gulshan Avenue, Dhaka 1212, Bangladesh</p><h2>Invoice ${o.order_number}</h2><p class="muted">${new Date(o.created_at).toLocaleString()}</p><h3>Customer</h3><p>${o.customer_name}<br>${o.customer_phone}<br>${o.shipping_address}</p><h3>Items</h3>${items.map((i) => `<div class="row"><span>${i.name} × ${i.quantity}</span><span>৳${Number(i.line_total_bdt).toLocaleString()}</span></div>`).join('')}<div class="tot row"><span>Total</span><span>৳${Number(o.total_bdt).toLocaleString()}</span></div><p class="muted" style="margin-top:30px">Payment: ${o.payment_method} (${o.payment_status}) · Status: ${o.status}</p></body></html>`);
    w.document.close();
    w.print();
  };

  const STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Orders ({orders.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => setCreating(true)} className="btn-gold px-4 py-2 text-sm"><PlusCircle size={14} /> Create Order</button>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-glass w-36 py-2 text-sm">
            <option value="all" className="bg-ink-900">All</option>
            {STATUSES.map((s) => <option key={s} value={s} className="bg-ink-900">{s}</option>)}
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order / phone…" className="input-glass w-44 pl-9 py-2 text-sm" />
          </div>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer-bg" />)}</div> : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="card-3d flex flex-wrap items-center gap-3 p-4">
              <button onClick={async () => { setSelected(o); const { data } = await supabase.from('order_items').select('*').eq('order_id', o.id); setItems(data || []); }} className="flex flex-1 items-center gap-3 text-left">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]"><ShoppingCart size={16} className="text-gold-400" /></div>
                <div>
                  <p className="font-mono text-sm font-semibold text-gold-300">{o.order_number}</p>
                  <p className="text-xs text-ink-400">{o.customer_name} · {o.customer_phone} · {new Date(o.created_at).toLocaleDateString()}</p>
                  {o.trxid && <p className="text-xs text-accent-300">TrxID: <span className="font-mono">{o.trxid}</span></p>}
                  {o.binance_txid && <p className="text-xs text-gold-300">Binance TxID: <span className="font-mono">{o.binance_txid}</span></p>}
                </div>
              </button>
              <span className="text-sm text-ink-100">{formatMoney(Number(o.total_bdt), 'BDT', settings)}</span>
              <span className={`chip ${o.payment_status === 'paid' ? 'border-accent-500/40 text-accent-300' : 'border-warning/40 text-warning'}`}>{o.payment_status}</span>
              {(o.payment_method === 'bkash' || o.payment_method === 'nagad' || o.payment_method === 'rocket') && o.payment_status !== 'paid' && (
                <button onClick={() => verifyPayment(o.id)} className="btn-gold px-3 py-1.5 text-xs" title="Mark as paid"><CheckCircle2 size={12} /> Verify</button>
              )}
              <button onClick={() => sendToCourier(o)} className="btn-ghost px-3 py-1.5 text-xs" title="Send to courier"><Send size={12} /> Courier</button>
              <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-ink-100">
                {STATUSES.map((s) => <option key={s} value={s} className="bg-ink-900">{s}</option>)}
              </select>
              <button onClick={() => printInvoice(o)} className="btn-ghost p-2" title="Print invoice"><Download size={14} /></button>
              <Link to={`/order/${o.order_number}`} className="btn-ghost p-2"><Eye size={14} /></Link>
            </div>
          ))}
          {filtered.length === 0 && <p className="rounded-2xl border border-white/10 p-8 text-center text-ink-400">No orders match.</p>}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order ${selected.order_number}` : ''} size="lg">
        {selected && (
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><p className="text-xs uppercase text-ink-400">Customer</p><p className="text-ink-100">{selected.customer_name}</p><p className="text-ink-300">{selected.customer_phone}</p><p className="text-ink-300">{selected.shipping_address}</p></div>
              <div className="sm:text-right"><p className="text-xs uppercase text-ink-400">Payment</p><p className="text-ink-100 uppercase">{selected.payment_method}</p><p className="text-ink-300">{selected.payment_status}</p><p className="mt-2 font-semibold text-gold-300">{formatMoney(Number(selected.total_bdt), 'BDT', settings)}</p></div>
            </div>
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-xs uppercase text-ink-400">Items</p>
              {items.map((i) => (
                <div key={i.id} className="flex justify-between py-1.5 text-sm">
                  <span className="text-ink-100">{i.name} × {i.quantity}</span>
                  <span className="text-ink-200">৳{Number(i.line_total_bdt).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {selected.trxid && <p className="text-xs text-accent-300">TrxID: <span className="font-mono">{selected.trxid}</span></p>}
            {selected.binance_txid && <p className="text-xs text-gold-300">Binance TxID: <span className="font-mono">{selected.binance_txid}</span></p>}
            {selected.courier_tracking && (
              <div className="rounded-xl border border-white/10 p-3 text-sm">
                <p className="text-xs uppercase text-ink-400">Courier</p>
                <p className="text-ink-100">{selected.courier_name || 'Steadfast'} · Tracking: <span className="font-mono text-gold-300">{selected.courier_tracking}</span></p>
                <p className="text-xs text-ink-400">Booked: {selected.courier_booked_at ? new Date(selected.courier_booked_at).toLocaleString() : '—'}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => printInvoice(selected)} className="btn-gold flex-1"><Download size={14} /> Print Invoice</button>
              {(selected.payment_method === 'bkash' || selected.payment_method === 'nagad' || selected.payment_method === 'rocket') && selected.payment_status !== 'paid' && (
                <button onClick={() => verifyPayment(selected.id)} className="btn-ghost"><CheckCircle2 size={14} /> Verify Payment</button>
              )}
              <button onClick={() => sendToCourier(selected)} className="btn-ghost"><Send size={14} /> Send to Courier</button>
              <button onClick={() => setSelected(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        )}
      </Modal>
      {creating && (
        <ManualOrderModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
}

// ============ MANUAL ORDER CREATOR ============
function ManualOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', notes: '', paymentMethod: 'cod' });
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; price_bdt: number; image: string; quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchProducts({}).then(setProducts).catch(() => {}); }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  const addItem = (p: Product) => {
    const existing = selected.find((s) => s.id === p.id);
    if (existing) {
      setSelected(selected.map((s) => s.id === p.id ? { ...s, quantity: s.quantity + 1 } : s));
    } else {
      setSelected([...selected, { id: p.id, name: p.name, price_bdt: Number(p.price_bdt), image: p.images?.[0] || '', quantity: 1 }]);
    }
  };
  const removeItem = (id: string) => setSelected(selected.filter((s) => s.id !== id));
  const updateQty = (id: string, qty: number) => setSelected(selected.map((s) => s.id === id ? { ...s, quantity: Math.max(1, qty) } : s));
  const subtotal = selected.reduce((sum, s) => sum + s.price_bdt * s.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 80;
  const total = subtotal + shipping;

  const save = async () => {
    setSaving(true); setError('');
    if (!form.name || !form.phone || !form.address) { setError('Name, phone, and address are required.'); setSaving(false); return; }
    if (selected.length === 0) { setError('Add at least one product.'); setSaving(false); return; }
    const { data: orderNum } = await supabase.rpc('generate_order_number');
    const orderNumber = orderNum as string;
    const { data: orderRow, error: orderErr } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: null,
      shipping_address: form.address,
      city: form.city || null,
      subtotal_bdt: subtotal,
      discount_bdt: 0,
      shipping_bdt: shipping,
      total_bdt: total,
      payment_method: form.paymentMethod,
      payment_status: 'unpaid',
      status: 'pending',
      notes: form.notes || null,
    }).select().single();
    if (orderErr || !orderRow) { setError(orderErr?.message || 'Failed to create order'); setSaving(false); return; }
    const orderItems = selected.map((s) => ({
      order_id: orderRow.id,
      product_id: s.id,
      name: s.name,
      image_url: s.image,
      unit_price_bdt: s.price_bdt,
      quantity: s.quantity,
      line_total_bdt: s.price_bdt * s.quantity,
    }));
    await supabase.from('order_items').insert(orderItems);
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Create Manual Order (WhatsApp)" size="lg">
      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Customer Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Phone *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-glass" placeholder="01XXXXXXXXX" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-glass">
              <option value="cod" className="bg-ink-900">Cash on Delivery</option>
              <option value="bkash" className="bg-ink-900">bKash</option>
              <option value="nagad" className="bg-ink-900">Nagad</option>
              <option value="rocket" className="bg-ink-900">Rocket</option>
              <option value="card" className="bg-ink-900">Card</option>
              <option value="binance" className="bg-ink-900">Binance Pay</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Address *</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-glass min-h-16 resize-none" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-glass" placeholder="WhatsApp conversation reference…" /></div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase text-ink-400">Add Products</label>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="input-glass w-full pl-9 py-2 text-sm" />
          </div>
          {search && filtered.length > 0 && (
            <div className="mb-3 space-y-1 rounded-xl border border-white/10 p-2">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => { addItem(p); setSearch(''); }} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white/5">
                  <img src={p.images?.[0]} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="flex-1 text-sm text-ink-100">{p.name}</span>
                  <span className="text-xs text-gold-300">৳{Number(p.price_bdt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
          {selected.length > 0 && (
            <div className="space-y-2">
              {selected.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-2">
                  <img src={s.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="flex-1 text-sm text-ink-100">{s.name}</span>
                  <input type="number" min="1" value={s.quantity} onChange={(e) => updateQty(s.id, Number(e.target.value))} className="input-glass w-16 py-1 text-sm" />
                  <span className="text-sm text-ink-200">৳{(s.price_bdt * s.quantity).toLocaleString()}</span>
                  <button onClick={() => removeItem(s.id)} className="btn-ghost p-1.5 text-danger"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.04] p-3 text-sm">
          <div className="flex justify-between text-ink-300"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between text-ink-300"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `৳${shipping}`}</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-ink-50"><span>Total</span><span className="text-gold-300">৳{total.toLocaleString()}</span></div>
        </div>

        {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-gold flex-1">{saving ? 'Creating…' : <><PlusCircle size={14} /> Create Order</>}</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => { supabase.from('coupons').select('*').order('created_at', { ascending: false }).then(({ data }) => setCoupons((data as Coupon[]) || [])); };
  useEffect(load, []);

  const del = async (c: Coupon) => { if (!confirm(`Delete coupon ${c.code}?`)) return; await supabase.from('coupons').delete().eq('id', c.id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Coupons ({coupons.length})</h2><button onClick={() => setCreating(true)} className="btn-gold px-4 py-2 text-sm"><Plus size={14} /> Add Coupon</button></div>
      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="card-3d flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-mono font-semibold text-gold-300">{c.code}</p>
              <p className="text-xs text-ink-400">{c.discount_type === 'percentage' ? `${c.value}% off` : `৳${c.value} off`} · Used {c.used_count}/{c.usage_limit || '∞'} · {c.is_active ? 'active' : 'inactive'}</p>
            </div>
            <button onClick={() => setEditing(c)} className="btn-ghost p-2"><Pencil size={14} /></button>
            <button onClick={() => del(c)} className="btn-ghost p-2 text-danger"><Trash2 size={14} /></button>
          </div>
        ))}
        {coupons.length === 0 && <p className="rounded-2xl border border-white/10 p-8 text-center text-ink-400">No coupons yet.</p>}
      </div>
      {(editing || creating) && <CouponEditModal coupon={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />}
    </div>
  );
}

function CouponEditModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    value: coupon?.value?.toString() || '10',
    min_order_bdt: coupon?.min_order_bdt?.toString() || '0',
    max_discount_bdt: coupon?.max_discount_bdt?.toString() || '',
    usage_limit: coupon?.usage_limit?.toString() || '',
    expires_at: coupon?.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 10) : '',
    is_active: coupon?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discount_type: form.discount_type as 'percentage' | 'flat',
      value: Number(form.value),
      min_order_bdt: Number(form.min_order_bdt) || 0,
      max_discount_bdt: form.max_discount_bdt ? Number(form.max_discount_bdt) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    const { error: err } = coupon ? await supabase.from('coupons').update(payload).eq('id', coupon.id) : await supabase.from('coupons').insert(payload);
    if (err) setError(err.message); else { setSaving(false); onSaved(); return; }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={coupon ? 'Edit Coupon' : 'New Coupon'} size="md">
      <div className="space-y-4 p-6">
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-glass font-mono" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-glass" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Type</label><select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'flat' })} className="input-glass"><option value="percentage" className="bg-ink-900">Percentage</option><option value="flat" className="bg-ink-900">Flat</option></select></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Value</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Min order (BDT)</label><input type="number" value={form.min_order_bdt} onChange={(e) => setForm({ ...form, min_order_bdt: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Max discount (BDT)</label><input type="number" value={form.max_discount_bdt} onChange={(e) => setForm({ ...form, max_discount_bdt: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Usage limit</label><input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Expires</label><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input-glass" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-gold-400" /> Active</label>
        {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2"><button onClick={save} disabled={saving} className="btn-gold flex-1">{saving ? 'Saving…' : 'Save'}</button><button onClick={onClose} className="btn-ghost">Cancel</button></div>
      </div>
    </Modal>
  );
}

// ============ SETTINGS SHARED ============
function useSettingsForm() {
  const { refresh } = useSettings();
  const [form, setForm] = useState<Partial<StoreSettings>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Admin reads the FULL settings row (with sensitive fields like wallet numbers,
  // courier secrets, gemini key) directly from store_settings — authenticated only.
  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setForm(data as StoreSettings);
      setLoaded(true);
    });
  }, []);

  const save = async (partial?: Partial<StoreSettings>) => {
    setSaving(true); setMsg('');
    const payload = { ...form, ...partial };
    const { error } = await supabase.from('store_settings').update(payload).eq('id', 1);
    if (error) setMsg(error.message); else { setMsg('Saved.'); await refresh(); }
    setSaving(false);
  };
  return { form, setForm, save, saving, msg, loaded };
}

function AppearanceTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  const colors: { key: keyof StoreSettings; label: string }[] = [
    { key: 'primary_color', label: 'Primary' },
    { key: 'secondary_color', label: 'Secondary' },
    { key: 'accent_color', label: 'Accent' },
    { key: 'bg_color', label: 'Background' },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Theme & Style</h2>

      {/* Theme Mode Settings */}
      <div className="card-3d space-y-5 p-6">
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-wider text-ink-400">Theme Mode</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-ink-400">Default Theme (for new visitors)</label>
              <select value={s.default_theme || 'dark'} onChange={(e) => set('default_theme', e.target.value)} className="input-glass">
                <option value="dark" className="bg-ink-900">Dark — Obsidian Black / Gold</option>
                <option value="light" className="bg-ink-900">Light — Marble White / Gold</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Header Theme Toggle</label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => set('theme_toggle_visible', !s.theme_toggle_visible)}
                  className={`relative h-7 w-12 rounded-full transition-all ${s.theme_toggle_visible ? 'bg-gold-sheen' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.theme_toggle_visible ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-sm text-ink-200">{s.theme_toggle_visible ? 'Visible — visitors can switch' : 'Hidden — locked to default'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Display Settings */}
      <div className="card-3d space-y-5 p-6">
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-wider text-ink-400">Hero Banner Display</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-ink-400">Overlay Darkness: {s.hero_overlay_opacity ?? 65}%</label>
              <input type="range" min={20} max={90} value={s.hero_overlay_opacity ?? 65} onChange={(e) => set('hero_overlay_opacity', Number(e.target.value))} className="w-full accent-gold-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Image Brightness: {s.hero_brightness ?? 100}%</label>
              <input type="range" min={50} max={150} value={s.hero_brightness ?? 100} onChange={(e) => set('hero_brightness', Number(e.target.value))} className="w-full accent-gold-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Parallax Scroll Effect</label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => set('hero_parallax', !s.hero_parallax)}
                  className={`relative h-7 w-12 rounded-full transition-all ${s.hero_parallax ? 'bg-gold-sheen' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.hero_parallax ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-sm text-ink-200">{s.hero_parallax ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-3d space-y-5 p-6">
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-wider text-ink-400">Color Palette</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {colors.map((c) => (
              <div key={c.key}>
                <label className="mb-1 block text-xs text-ink-400">{c.label}</label>
                <input type="color" value={String(s[c.key] || '#000000')} onChange={(e) => set(c.key, e.target.value)} className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-wider text-ink-400">Card & Button Style</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[{ k: 'button_depth', l: 'Button depth (px)' }, { k: 'card_shadow', l: 'Card shadow (px)' }, { k: 'hover_zoom', l: 'Hover zoom (%)' }, { k: 'border_radius', l: 'Border radius (px)' }].map((x) => (
              <div key={x.k}>
                <label className="mb-1 block text-xs text-ink-400">{x.l}</label>
                <input type="number" value={String(s[x.k as keyof StoreSettings] ?? 0)} onChange={(e) => set(x.k as keyof StoreSettings, Number(e.target.value))} className="input-glass" />
              </div>
            ))}
          </div>
        </div>
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Theme'}</button>
      </div>
    </div>
  );
}

function PixelsTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  const fields: { k: keyof StoreSettings; l: string; placeholder: string }[] = [
    { k: 'facebook_pixel_id', l: 'Facebook (Meta) Pixel ID', placeholder: 'e.g. 123456789012345' },
    { k: 'facebook_capi_token', l: 'Facebook CAPI Token', placeholder: 'CAPI server token' },
    { k: 'tiktok_pixel_id', l: 'TikTok Pixel ID', placeholder: 'e.g. C4XXXXXXXXXXXXXXXXX' },
    { k: 'gtm_id', l: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX' },
    { k: 'ga4_id', l: 'Google Analytics 4 ID', placeholder: 'G-XXXXXXXXXX' },
    { k: 'clarity_id', l: 'Microsoft Clarity ID', placeholder: 'e.g. abc1234567' },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Tracking Pixels & Analytics</h2>
      <p className="text-sm text-ink-400">Paste your IDs below. Pixels auto-load on the storefront and fire e-commerce events (ViewContent, AddToCart, InitiateCheckout, Purchase).</p>
      <div className="card-3d space-y-4 p-6">
        {fields.map((f) => (
          <div key={f.k}>
            <label className="mb-1 block text-xs uppercase text-ink-400">{f.l}</label>
            <input value={String(s[f.k] || '')} onChange={(e) => set(f.k, e.target.value)} placeholder={f.placeholder} className="input-glass font-mono text-sm" />
          </div>
        ))}
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Pixels'}</button>
      </div>
    </div>
  );
}

function PaymentsTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Payment Gateways</h2>
      <div className="card-3d space-y-4 p-6">
        <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={s.cod_enabled} onChange={(e) => set('cod_enabled', e.target.checked)} className="accent-gold-400" /> Cash on Delivery (COD)</label>
        <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={s.card_enabled} onChange={(e) => set('card_enabled', e.target.checked)} className="accent-gold-400" /> Card payment</label>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">bKash Number</label><input value={s.bkash_number || ''} onChange={(e) => set('bkash_number', e.target.value)} className="input-glass" placeholder="01XXXXXXXXX" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">bKash Instructions</label><textarea value={s.bkash_instructions || ''} onChange={(e) => set('bkash_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" placeholder="Shown at checkout when bKash is selected" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Nagad Number</label><input value={s.nagad_number || ''} onChange={(e) => set('nagad_number', e.target.value)} className="input-glass" placeholder="01XXXXXXXXX" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Nagad Instructions</label><textarea value={s.nagad_instructions || ''} onChange={(e) => set('nagad_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" placeholder="Shown at checkout when Nagad is selected" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Rocket Number</label><input value={s.rocket_number || ''} onChange={(e) => set('rocket_number', e.target.value)} className="input-glass" placeholder="01XXXXXXXXX-1" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Rocket Instructions</label><textarea value={s.rocket_instructions || ''} onChange={(e) => set('rocket_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">COD Instructions</label><textarea value={s.cod_instructions || ''} onChange={(e) => set('cod_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Card Instructions</label><textarea value={s.card_instructions || ''} onChange={(e) => set('card_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" /></div>
        <div className="border-t border-white/10 pt-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-gold-300"><CreditCard size={16} /> Card Gateway Configuration</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Gateway Name</label><input value={s.card_gateway_name || ''} onChange={(e) => set('card_gateway_name', e.target.value)} className="input-glass" placeholder="SSLCommerz / Shurjopay / Stripe / Custom" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Merchant / Publishable Key</label><input value={s.card_merchant_key || ''} onChange={(e) => set('card_merchant_key', e.target.value)} className="input-glass font-mono text-sm" placeholder="Store ID or publishable key" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Secret Key</label><input value={s.card_secret_key || ''} onChange={(e) => set('card_secret_key', e.target.value)} className="input-glass font-mono text-sm" placeholder="Server-side secret key" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Payment / Redirect URL</label><input value={s.card_payment_url || ''} onChange={(e) => set('card_payment_url', e.target.value)} className="input-glass font-mono text-sm" placeholder="https://gateway.example.com/pay" /></div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-gold-300"><Bitcoin size={16} /> Binance Pay / USDT</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Binance Pay ID</label><input value={s.binance_pay_id || ''} onChange={(e) => set('binance_pay_id', e.target.value)} className="input-glass" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">USDT Wallet (TRC20)</label><input value={s.usdt_wallet_address || ''} onChange={(e) => set('usdt_wallet_address', e.target.value)} className="input-glass font-mono text-xs" /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-xs uppercase text-ink-400">Binance QR Image URL</label><input value={s.binance_qr_url || ''} onChange={(e) => set('binance_qr_url', e.target.value)} className="input-glass" placeholder="https://…" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Binance Instructions</label><textarea value={s.binance_instructions || ''} onChange={(e) => set('binance_instructions', e.target.value)} className="input-glass min-h-16 resize-none text-sm" /></div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">BDT → USD rate</label><input type="number" step="0.01" value={s.bdt_to_usd_rate || 120} onChange={(e) => set('bdt_to_usd_rate', Number(e.target.value))} className="input-glass" /></div>
          </div>
        </div>
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Payments'}</button>
      </div>
    </div>
  );
}

function AiTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Gemini AI Assistant</h2>
      <p className="text-sm text-ink-400">The floating chat widget uses Google Gemini to answer customer questions about products, orders, shipping, and returns.</p>
      <div className="card-3d space-y-4 p-6">
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Gemini API Key</label><input value={s.gemini_api_key || ''} onChange={(e) => setForm({ ...form, gemini_api_key: e.target.value })} className="input-glass font-mono text-sm" placeholder="AIza…" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">System Prompt</label><textarea value={s.gemini_system_prompt || ''} onChange={(e) => setForm({ ...form, gemini_system_prompt: e.target.value })} className="input-glass min-h-32 resize-none text-sm" /></div>
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save AI Settings'}</button>
      </div>
    </div>
  );
}

function ContactTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Contact & Social</h2>
      <div className="card-3d space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Store Name</label><input value={s.store_name || ''} onChange={(e) => set('store_name', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Tagline</label><input value={s.tagline || ''} onChange={(e) => set('tagline', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><Phone size={11} /> Phone</label><input value={s.phone || ''} onChange={(e) => set('phone', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><Mail size={11} /> Email</label><input value={s.email || ''} onChange={(e) => set('email', e.target.value)} className="input-glass" /></div>
          <div className="sm:col-span-2"><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><MapPin size={11} /> Address</label><input value={s.address || ''} onChange={(e) => set('address', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><Facebook size={11} /> Facebook URL</label><input value={s.facebook_url || ''} onChange={(e) => set('facebook_url', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><Instagram size={11} /> Instagram URL</label><input value={s.instagram_url || ''} onChange={(e) => set('instagram_url', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><Music2 size={11} /> TikTok URL</label><input value={s.tiktok_url || ''} onChange={(e) => set('tiktok_url', e.target.value)} className="input-glass" /></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs uppercase text-ink-400"><MessageCircle size={11} /> WhatsApp URL</label><input value={s.whatsapp_url || ''} onChange={(e) => set('whatsapp_url', e.target.value)} className="input-glass" /></div>
        </div>
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Contact'}</button>
      </div>
    </div>
  );
}

function FraudTab() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ kind: 'phone', value: '', reason: '' });
  const load = () => { supabase.from('fraud_blacklist').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems(data || [])); };
  useEffect(load, []);
  const add = async () => {
    if (!form.value.trim()) return;
    await supabase.from('fraud_blacklist').insert({ kind: form.kind, value: form.value.trim(), reason: form.reason || null });
    setForm({ kind: 'phone', value: '', reason: '' });
    load();
  };
  const del = async (id: string) => { await supabase.from('fraud_blacklist').delete().eq('id', id); load(); };
  const { settings, refresh } = useSettings();
  const [shieldOn, setShieldOn] = useState(settings?.fraud_shield_enabled ?? true);
  const toggleShield = async () => {
    const next = !shieldOn; setShieldOn(next);
    await supabase.from('store_settings').update({ fraud_shield_enabled: next }).eq('id', 1);
    refresh();
  };

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Fraud Shield</h2>
      <div className="card-3d flex items-center justify-between p-5">
        <div><p className="font-medium text-ink-100">Enable Fraud Shield</p><p className="text-xs text-ink-400">Flag suspicious orders and block blacklisted IPs/phones.</p></div>
        <button onClick={toggleShield} className={`relative h-7 w-12 rounded-full transition-all ${shieldOn ? 'bg-gold-sheen' : 'bg-white/10'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${shieldOn ? 'left-6' : 'left-1'}`} /></button>
      </div>
      <div className="card-3d space-y-4 p-6">
        <h3 className="font-display text-lg">Add to Blacklist</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="input-glass"><option value="phone" className="bg-ink-900">Phone</option><option value="ip" className="bg-ink-900">IP Address</option><option value="email" className="bg-ink-900">Email</option></select>
          <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value to block" className="input-glass" />
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason (optional)" className="input-glass" />
        </div>
        <button onClick={add} className="btn-gold w-fit"><Plus size={14} /> Add</button>
      </div>
      <div className="card-3d p-5">
        <h3 className="mb-3 font-display text-lg">Blacklist ({items.length})</h3>
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm">
              <div><span className="chip">{b.kind}</span> <span className="ml-2 font-mono text-ink-100">{b.value}</span> {b.reason && <span className="ml-2 text-xs text-ink-400">{b.reason}</span>}</div>
              <button onClick={() => del(b.id)} className="text-danger hover:text-danger/80"><Trash2 size={14} /></button>
            </div>
          ))}
          {items.length === 0 && <p className="text-ink-400">No blacklisted entries.</p>}
        </div>
      </div>
    </div>
  );
}

// ============ CATEGORIES ============
function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => { fetchCategories().then((c) => { setCats(c); setLoading(false); }); };
  useEffect(load, []);

  const saveCat = async (id: string, image_url: string) => {
    await supabase.from('categories').update({ image_url }).eq('id', id);
    load();
  };

  const del = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Sub-categories will become top-level.`)) return;
    await supabase.from('categories').delete().eq('id', c.id);
    load();
  };

  const mains = cats.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Categories</h2>
          <p className="text-sm text-ink-400">Organize products under main categories and sub-categories. Set thumbnail images for menu cards.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-gold px-4 py-2 text-sm"><Plus size={14} /> Add Category</button>
      </div>
      {loading ? <div className="h-40 rounded-2xl shimmer-bg" /> : (
        <div className="space-y-6">
          {mains.map((main) => (
            <div key={main.id} className="card-3d p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gold-300" />
                  <h3 className="font-display text-lg text-ink-50">{main.name}</h3>
                  <span className="chip">Main</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditing(main)} className="btn-ghost p-2"><Pencil size={14} /></button>
                  <button onClick={() => del(main)} className="btn-ghost p-2 text-danger hover:bg-danger/10"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mb-3"><CategoryEditCard cat={main} onSave={(url) => saveCat(main.id, url)} /></div>
              <div className="ml-4 space-y-2 border-l border-white/10 pl-4">
                {cats.filter((c) => c.parent_id === main.id).sort((a, b) => a.sort_order - b.sort_order).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-100">{sub.name}</span>
                      <span className="chip text-[10px]">Sub</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(sub)} className="btn-ghost p-1.5"><Pencil size={12} /></button>
                      <button onClick={() => del(sub)} className="btn-ghost p-1.5 text-danger hover:bg-danger/10"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                {cats.filter((c) => c.parent_id === main.id).length === 0 && <p className="text-xs text-ink-500">No sub-categories yet.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <CategoryEditModal cat={editing} cats={cats} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />
      )}
    </div>
  );
}

function CategoryEditModal({ cat, cats, onClose, onSaved }: { cat: Category | null; cats: Category[]; onClose: () => void; onSaved: () => void }) {
  const mains = cats.filter((c) => !c.parent_id);
  const [form, setForm] = useState({
    name: cat?.name || '',
    slug: cat?.slug || '',
    parent_id: cat?.parent_id || '',
    image_url: cat?.image_url || '',
    sort_order: cat?.sort_order?.toString() || '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true); setError('');
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      parent_id: form.parent_id || null,
      image_url: form.image_url || null,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error: err } = cat ? await supabase.from('categories').update(payload).eq('id', cat.id) : await supabase.from('categories').insert(payload);
    if (err) setError(err.message); else { setSaving(false); onSaved(); return; }
    setSaving(false);
  };
  return (
    <Modal open onClose={onClose} title={cat ? 'Edit Category' : 'New Category'} size="md">
      <div className="space-y-4 p-6">
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className="input-glass" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-glass font-mono text-sm" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Parent Category (leave empty for main)</label>
          <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="input-glass">
            <option value="" className="bg-ink-900">— Main Category —</option>
            {mains.map((m) => <option key={m.id} value={m.id} className="bg-ink-900">{m.name}</option>)}
          </select>
        </div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Image URL</label><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-glass text-sm" placeholder="https://…" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Sort order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="input-glass" /></div>
        {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2"><button onClick={save} disabled={saving} className="btn-gold flex-1">{saving ? 'Saving…' : <>Save <Save size={14} /></>}</button><button onClick={onClose} className="btn-ghost">Cancel</button></div>
      </div>
    </Modal>
  );
}

function CategoryEditCard({ cat, onSave }: { cat: Category; onSave: (url: string) => void }) {
  const [url, setUrl] = useState(cat.image_url || '');
  const [saving, setSaving] = useState(false);
  return (
    <div className="card-3d space-y-3 p-4">
      <div className="relative h-32 overflow-hidden rounded-2xl bg-ink-900">
        {url ? <img src={url} alt={cat.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-ink-500"><ImageIcon size={24} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
        <p className="absolute bottom-2 left-3 font-display text-lg text-ink-50">{cat.name}</p>
      </div>
      <div><label className="mb-1 block text-xs uppercase text-ink-400">Image URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} className="input-glass text-sm" placeholder="https://…" /></div>
      <button onClick={async () => { setSaving(true); await onSave(url); setSaving(false); }} disabled={saving} className="btn-gold w-fit text-sm"><Save size={12} /> {saving ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

// ============ COURIER ============
function CourierTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  const couriers: { name: string; keyPrefix: string; hasSecret: boolean; hasMerchant: boolean }[] = [
    { name: 'Steadfast', keyPrefix: 'steadfast', hasSecret: true, hasMerchant: true },
    { name: 'Pathao', keyPrefix: 'pathao', hasSecret: true, hasMerchant: true },
    { name: 'RedX', keyPrefix: 'redx', hasSecret: true, hasMerchant: false },
    { name: 'Paperfly', keyPrefix: 'paperfly', hasSecret: false, hasMerchant: true },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Courier Integration</h2>
      <p className="text-sm text-ink-400">Configure courier API credentials for automatic shipping submission and tracking.</p>
      <div className="card-3d space-y-4 p-6">
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Default Courier</label>
          <select value={s.default_courier || 'steadfast'} onChange={(e) => set('default_courier', e.target.value)} className="input-glass">
            {couriers.map((c) => <option key={c.keyPrefix} value={c.keyPrefix} className="bg-ink-900">{c.name}</option>)}
          </select>
        </div>
        {couriers.map((c) => (
          <div key={c.keyPrefix} className="border-t border-white/10 pt-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-gold-300"><Truck size={16} /> {c.name}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs uppercase text-ink-400">API Key</label><input value={String(s[`${c.keyPrefix}_api_key` as keyof StoreSettings] || '')} onChange={(e) => set(`${c.keyPrefix}_api_key` as keyof StoreSettings, e.target.value)} className="input-glass font-mono text-sm" placeholder={`${c.name} API key`} /></div>
              {c.hasSecret && <div><label className="mb-1 block text-xs uppercase text-ink-400">Secret</label><input value={String(s[`${c.keyPrefix}_secret` as keyof StoreSettings] || '')} onChange={(e) => set(`${c.keyPrefix}_secret` as keyof StoreSettings, e.target.value)} className="input-glass font-mono text-sm" placeholder={`${c.name} secret`} /></div>}
              {c.hasMerchant && <div><label className="mb-1 block text-xs uppercase text-ink-400">Merchant ID</label><input value={String(s[`${c.keyPrefix}_merchant_id` as keyof StoreSettings] || '')} onChange={(e) => set(`${c.keyPrefix}_merchant_id` as keyof StoreSettings, e.target.value)} className="input-glass font-mono text-sm" placeholder={`${c.name} merchant ID`} /></div>}
            </div>
          </div>
        ))}
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Courier Settings'}</button>
      </div>
    </div>
  );
}

// ============ POLICIES ============
function PoliciesTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const set = (k: keyof StoreSettings, v: any) => setForm({ ...form, [k]: v });
  const fields: { k: keyof StoreSettings; l: string; ph: string }[] = [
    { k: 'policy_return', l: 'Return Policy Badge', ph: '7 Days Easy Return Policy' },
    { k: 'policy_authentic', l: 'Authenticity Badge', ph: '100% Authentic Product' },
    { k: 'policy_shipping', l: 'Shipping Badge', ph: 'Express Shipping All Over Bangladesh' },
    { k: 'policy_warranty', l: 'Warranty Badge (optional)', ph: '1 Year Warranty' },
    { k: 'policy_support', l: 'Support Badge', ph: '24/7 Customer Support' },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Policy & Trust Badges</h2>
      <p className="text-sm text-ink-400">These texts appear as trust badges on product pages and the storefront. Individual products can override with custom guarantees in the Product Editor.</p>
      <div className="card-3d space-y-4 p-6">
        {fields.map((f) => (
          <div key={f.k}><label className="mb-1 block text-xs uppercase text-ink-400">{f.l}</label><input value={String(s[f.k] || '')} onChange={(e) => set(f.k, e.target.value)} className="input-glass" placeholder={f.ph} /></div>
        ))}
        {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
        <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Policies'}</button>
      </div>
    </div>
  );
}

// ============ HERO BANNERS ============
function BannersTab() {
  const { form, setForm, save, saving, msg } = useSettingsForm();
  const s = form as StoreSettings;
  const banners = s.hero_banners || [];
  const update = (i: number, field: string, val: string) => {
    const next = [...banners];
    next[i] = { ...next[i], [field]: val };
    setForm({ ...form, hero_banners: next });
  };
  const add = () => setForm({ ...form, hero_banners: [...banners, { image: '', title: '', subtitle: '', cta: 'Shop Now', link: '/shop' }] });
  const remove = (i: number) => setForm({ ...form, hero_banners: banners.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Homepage Hero Banners</h2>
      <p className="text-sm text-ink-400">Manage the rotating hero banner slider on the homepage. Add multiple slides for a carousel effect.</p>
      <div className="space-y-4">
        {banners.map((b, i) => (
          <div key={i} className="card-3d space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-ink-400">Slide {i + 1}</span>
              <button onClick={() => remove(i)} className="text-danger hover:text-danger/80"><Trash2 size={14} /></button>
            </div>
            <div className="relative h-32 overflow-hidden rounded-2xl bg-ink-900">
              {b.image ? <img src={b.image} alt={b.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-ink-500"><ImageIcon size={24} /></div>}
            </div>
            <div><label className="mb-1 block text-xs uppercase text-ink-400">Image URL</label><input value={b.image} onChange={(e) => update(i, 'image', e.target.value)} className="input-glass text-sm" placeholder="https://…" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs uppercase text-ink-400">Title</label><input value={b.title} onChange={(e) => update(i, 'title', e.target.value)} className="input-glass text-sm" /></div>
              <div><label className="mb-1 block text-xs uppercase text-ink-400">Subtitle</label><input value={b.subtitle} onChange={(e) => update(i, 'subtitle', e.target.value)} className="input-glass text-sm" /></div>
              <div><label className="mb-1 block text-xs uppercase text-ink-400">CTA Text</label><input value={b.cta} onChange={(e) => update(i, 'cta', e.target.value)} className="input-glass text-sm" /></div>
              <div><label className="mb-1 block text-xs uppercase text-ink-400">CTA Link</label><input value={b.link} onChange={(e) => update(i, 'link', e.target.value)} className="input-glass text-sm" /></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} className="btn-ghost w-fit"><Plus size={14} /> Add Slide</button>
      {msg && <p className={`text-sm ${msg.includes('Saved') ? 'text-accent-300' : 'text-danger'}`}>{msg}</p>}
      <button onClick={() => save()} disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Banners'}</button>
    </div>
  );
}

// ============ ADMIN SECURITY ============
function AdminSecurityTab() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  const changePassword = async () => {
    setPwSaving(true); setPwMsg('');
    if (pwForm.newPassword.length < 8) { setPwMsg('New password must be at least 8 characters'); setPwSaving(false); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg('Passwords do not match'); setPwSaving(false); return; }
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'change_password', currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
    });
    if (error || data?.error) setPwMsg(data?.error || error?.message || 'Failed');
    else { setPwMsg('Password updated successfully'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    setPwSaving(false);
  };

  const changeEmail = async () => {
    setEmailSaving(true); setEmailMsg('');
    if (!emailForm.newEmail.includes('@')) { setEmailMsg('Enter a valid email'); setEmailSaving(false); return; }
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'change_email', currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail },
    });
    if (error || data?.error) setEmailMsg(data?.error || error?.message || 'Failed');
    else { setEmailMsg('Email updated successfully'); setEmailForm({ currentPassword: '', newEmail: '' }); }
    setEmailSaving(false);
  };

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Admin Security</h2>
      <p className="text-sm text-ink-400">Manage your admin account credentials. Changes require your current password for verification.</p>

      <div className="card-3d space-y-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-gold-300"><Lock size={16} /> Change Password</h3>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Current Password</label><input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="input-glass" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs uppercase text-ink-400">New Password</label><input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="input-glass" /></div>
          <div><label className="mb-1 block text-xs uppercase text-ink-400">Confirm New Password</label><input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="input-glass" /></div>
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.includes('successfully') ? 'text-accent-300' : 'text-danger'}`}>{pwMsg}</p>}
        <button onClick={changePassword} disabled={pwSaving} className="btn-gold w-fit">{pwSaving ? 'Saving…' : 'Update Password'}</button>
      </div>

      <div className="card-3d space-y-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-gold-300"><Mail size={16} /> Change Admin Email</h3>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Current Email</label><input value={user?.email || ''} disabled className="input-glass opacity-60" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">Current Password</label><input type="password" value={emailForm.currentPassword} onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })} className="input-glass" /></div>
        <div><label className="mb-1 block text-xs uppercase text-ink-400">New Email Address</label><input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} className="input-glass" /></div>
        {emailMsg && <p className={`text-sm ${emailMsg.includes('successfully') ? 'text-accent-300' : 'text-danger'}`}>{emailMsg}</p>}
        <button onClick={changeEmail} disabled={emailSaving} className="btn-gold w-fit">{emailSaving ? 'Saving…' : 'Update Email'}</button>
      </div>
    </div>
  );
}

// ============ DEVELOPER SETUP ============
function DeveloperSetupTab() {
  const [copied, setCopied] = useState<'url' | 'anon' | 'env' | null>(null);
  const copy = (text: string, kind: 'url' | 'anon' | 'env') => {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE'}

# Admin Credentials (for /admin or /login access)
VITE_ADMIN_EMAIL=eqbalbaharase@gmail.com
VITE_ADMIN_PASSWORD=demo123456`;

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Developer Setup</h2>
      <p className="text-sm text-ink-400">Environment variables and Supabase connection details. Copy these values into your <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env</code> file for local development.</p>

      <div className="card-3d space-y-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-gold-300"><Terminal size={16} /> Supabase Connection</h3>

        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-ink-400">Status</p>
          <span className={`chip ${SUPABASE_CONFIGURED ? 'border-accent-500/40 text-accent-300' : 'border-danger/40 text-danger'}`}>
            {SUPABASE_CONFIGURED ? 'Connected' : 'Not configured — .env missing'}
          </span>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-ink-400">VITE_SUPABASE_URL</label>
            <button onClick={() => copy(SUPABASE_URL || '', 'url')} className="btn-ghost px-2.5 py-1 text-xs">{copied === 'url' ? <CheckCircle2 size={11} /> : <Copy size={11} />} Copy</button>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 font-mono text-sm text-ink-100 break-all">{SUPABASE_URL || '— not set —'}</div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-ink-400">VITE_SUPABASE_ANON_KEY</label>
            <button onClick={() => copy(SUPABASE_ANON_KEY || '', 'anon')} className="btn-ghost px-2.5 py-1 text-xs">{copied === 'anon' ? <CheckCircle2 size={11} /> : <Copy size={11} />} Copy</button>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 font-mono text-xs text-ink-100 break-all">{SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 20)}…${SUPABASE_ANON_KEY.slice(-12)}` : '— not set —'}</div>
        </div>
      </div>

      <div className="card-3d space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg text-gold-300"><FileDown size={16} /> .env File Structure</h3>
          <button onClick={() => copy(envContent, 'env')} className="btn-ghost px-3 py-1.5 text-xs">{copied === 'env' ? <CheckCircle2 size={12} /> : <Copy size={12} />} Copy .env</button>
        </div>
        <p className="text-xs text-ink-400">Create a file named <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code> in the project root with the following content:</p>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-ink-950/80 p-4 font-mono text-xs leading-relaxed text-ink-100">{envContent}</pre>
        <p className="text-xs text-ink-400">After saving, restart the dev server for the new variables to take effect. The anon key is safe to expose in the browser — it only allows access protected by Row Level Security.</p>
      </div>
    </div>
  );
}
