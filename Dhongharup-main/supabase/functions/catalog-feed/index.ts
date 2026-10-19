// catalog-feed: streams active products as a CSV ad catalog feed for
// Meta Commerce Manager, TikTok Ads, and Google Merchant Center.
// Supports optional query params for filtered exports:
//   ?category=<slug>       — restrict to a category (and its subcategories)
//   ?items=<id,id,id>      — restrict to a specific set of product ids
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const url = new URL(req.url);
    const categorySlug = url.searchParams.get("category")?.trim() || "";
    const itemsParam = url.searchParams.get("items")?.trim() || "";

    // Resolve the requested category (and its child categories) into ids.
    let categoryIds: string[] = [];
    if (categorySlug) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, slug, parent_id")
        .or(`slug.eq.${categorySlug},parent_id.in.(select id from categories where slug.eq.${categorySlug})`);
      categoryIds = (cats || []).map((c: any) => c.id);
    }

    const itemIds = itemsParam
      ? itemsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let query = supabase
      .from("products")
      .select("id, name, slug, description, price_bdt, stock, status, images, sku, tags, category_id, category:categories(name)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (categoryIds.length > 0) query = query.in("category_id", categoryIds);
    if (itemIds.length > 0) query = query.in("id", itemIds);

    const { data: products, error } = await query;

    if (error) return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });

    const { data: settings } = await supabase.from("store_settings").select("store_name, bdt_to_usd_rate").eq("id", 1).maybeSingle();
    const brand = settings?.store_name || "DHONG GHAR";
    const usdRate = Number(settings?.bdt_to_usd_rate) || 120;

    const siteOrigin = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "https://dhongghar.com";

    const headers = [
      "id", "title", "description", "availability", "condition",
      "price", "link", "image_link", "brand", "google_product_category",
    ];

    const rows = (products || []).map((p: any) => {
      const catName = p.category?.name || "";
      const image = Array.isArray(p.images) ? p.images[0] || "" : "";
      const availability = Number(p.stock) > 0 ? "in stock" : "out of stock";
      const price = `${Number(p.price_bdt).toFixed(2)} BDT`;
      const link = `${siteOrigin}/product/${p.slug}`;
      const gpc = p.tags?.includes("saree") ? "Apparel & Accessories > Clothing > Saris"
        : p.tags?.includes("t-shirt") ? "Apparel & Accessories > Clothing > Shirts & Tops"
        : p.tags?.includes("cosmetics") ? "Health & Beauty > Beauty > Cosmetics"
        : catName ? `Apparel & Accessories > ${catName}` : "Apparel & Accessories";
      return [
        csvEscape(p.sku || p.id),
        csvEscape(p.name),
        csvEscape((p.description || "").replace(/\n/g, " ").slice(0, 5000)),
        csvEscape(availability),
        csvEscape("new"),
        csvEscape(price),
        csvEscape(link),
        csvEscape(image),
        csvEscape(brand),
        csvEscape(gpc),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="catalog.csv"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Server error: ${e?.message || "unknown"}`, { status: 500, headers: corsHeaders });
  }
});
