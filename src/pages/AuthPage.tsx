import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User as UserIcon, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/account');
      }
    } else {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/account');
      }
    }
  };

  return (
    <div className="relative flex min-h-[88vh] items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-glass-radial" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-strong overflow-hidden rounded-3xl shadow-glass-lg">
          <div className="border-b border-white/10 bg-gradient-to-br from-gold-400/10 to-transparent p-6 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-sheen font-display text-xl font-bold text-ink-950">DG</span>
              <span className="font-display text-2xl"><span className="text-ink-50">DHONG</span> <span className="gold-text">GHAR</span></span>
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold-400"><Sparkles size={12} /> {mode === 'signin' ? 'Welcome back' : 'Join the house'}</p>
          </div>

          <div className="p-6">
            <div className="mb-5 flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${mode === m ? 'bg-gold-sheen text-ink-950' : 'text-ink-300 hover:text-ink-50'}`}
                >{m === 'signin' ? 'Sign In' : 'Sign Up'}</button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Full Name</label>
                    <div className="relative">
                      <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input-glass pl-9" placeholder="Your name" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Phone</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-glass pl-9" placeholder="+880 17xx-xxxxxx" />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-glass pl-9" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-ink-400">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-glass pl-9" placeholder="••••••••" />
                </div>
              </div>

              {error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}

              <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-50">
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} />
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-ink-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-gold-300 hover:text-gold-200">
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
