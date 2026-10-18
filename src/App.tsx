import { useState } from 'react';
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
import { ShopPage } from '@/pages/ShopPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { AuthPage } from '@/pages/AuthPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { TrackOrderPage } from '@/pages/TrackOrderPage';
import { AccountPage } from '@/pages/AccountPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { AdminGate } from '@/pages/AdminPage';
import { useEffect } from 'react';

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
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage onOpenCart={() => setCartOpen(true)} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<AccountPage />} />
          <Route path="/order/:orderNumber" element={<OrderDetailPage />} />
          <Route path="/eqbalbaharase" element={<AdminGate />} />
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/login" element={<AdminGate />} />
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
