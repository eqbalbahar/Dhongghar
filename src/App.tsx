import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CartProvider } from '@/context/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { AIChatbot } from '@/components/AIChatbot';
import { HomePage } from '@/pages/HomePage';

const ShopPage = lazy(() => import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const AdminGate = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminGate })));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Shell() {
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<Suspense fallback={<PageLoader />}><ShopPage /></Suspense>} />
          <Route path="/product/:slug" element={<Suspense fallback={<PageLoader />}><ProductDetailPage onOpenCart={() => setCartOpen(true)} /></Suspense>} />
          <Route path="/auth" element={<Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
          <Route path="/checkout" element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} />
          <Route path="/track-order" element={<Suspense fallback={<PageLoader />}><TrackOrderPage /></Suspense>} />
          <Route path="/account" element={<Suspense fallback={<PageLoader />}><AccountPage /></Suspense>} />
          <Route path="/account/orders" element={<Suspense fallback={<PageLoader />}><AccountPage /></Suspense>} />
          <Route path="/order/:orderNumber" element={<Suspense fallback={<PageLoader />}><OrderDetailPage /></Suspense>} />
          <Route path="/eqbalbaharase" element={<Suspense fallback={<PageLoader />}><AdminGate /></Suspense>} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AIChatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <Shell />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
