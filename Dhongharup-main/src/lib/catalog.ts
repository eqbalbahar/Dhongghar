import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return ((data as Category[]) || []).filter((c) => c.is_active !== false);
}

export async function fetchAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return (data as Category[]) || [];
}

export async function fetchProducts(opts?: { category?: string; search?: string; limit?: number; featured?: boolean; flashSale?: boolean }): Promise<Product[]> {
  let q = supabase.from('products').select('*, category:categories(*)').eq('status', 'active').order('created_at', { ascending: false });
  if (opts?.category) q = q.eq('category_id', opts.category);
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.flashSale) q = q.eq('is_flash_sale', true);
  const { data, error } = await q;
  if (error) throw error;
  let products = (data as Product[]) || [];
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s) || p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }
  if (opts?.featured) {
    products = products.sort((a, b) => b.sales_count - a.sales_count);
  }
  return products;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*, category:categories(*)').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as Product) || null;
}

export async function fetchProductReviews(productId: string) {
  const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useFlashSaleCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState(() => (endsAt ? computeRemaining(endsAt) : null));
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setRemaining(computeRemaining(endsAt)), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return remaining;
}

function computeRemaining(iso: string): { h: number; m: number; s: number; done: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
  return {
    h: Math.floor(diff / 3.6e6),
    m: Math.floor((diff % 3.6e6) / 6e4),
    s: Math.floor((diff % 6e4) / 1000),
    done: false,
  };
}
