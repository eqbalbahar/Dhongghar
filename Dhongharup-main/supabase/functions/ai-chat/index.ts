// DHONG GHAR AI Chatbot — proxies Google Gemini with a strict system prompt
// sourced from store_settings. The Gemini API key lives in the GEMINI_API_KEY
// Supabase secret (managed via Admin panel → AI Assistant tab, stored in DB
// store_settings.gemini_api_key). We read it from the DB so the admin can update
// it without redeploying.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bootstrap Supabase client with service role to read settings + catalog.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: settings } = await supabase
      .from("store_settings")
      .select("gemini_api_key, gemini_system_prompt, store_name, phone, email, address")
      .eq("id", 1)
      .maybeSingle();

    const apiKey = settings?.gemini_api_key;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ reply: "The AI assistant is not configured yet. Please contact our support team via the details in the website footer." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      settings?.gemini_system_prompt ||
      "You are DHONG GHAR's Customer Care AI assistant. Only answer queries regarding products, stock, pricing, order tracking, shipping policies, and return procedures of DHONG GHAR. Politely decline to answer any unrelated general questions.";

    // Fetch a snapshot of active products to ground answers in real catalog data.
    const { data: products } = await supabase
      .from("products")
      .select("name, price_bdt, stock, status, category:categories(name)")
      .eq("status", "active")
      .limit(40);

    const catalogSnippet = (products || [])
      .map((p: any) => `- ${p.name} — ৳${p.price_bdt} (stock: ${p.stock}) [${p.category?.name || "uncategorized"}]`)
      .join("\n");

    const contactLine = settings
      ? `Store contact — Phone: ${settings.phone || "n/a"}, Email: ${settings.email || "n/a"}, Address: ${settings.address || "n/a"}.`
      : "";

    const fullSystem = `${systemPrompt}\n\nCurrent product catalog (use this for stock & pricing questions):\n${catalogSnippet}\n\n${contactLine}\n\nKeep replies concise (under 120 words), friendly, and on-brand for a luxury fashion house. If a customer asks to track an order, tell them to use the "Track Order" page with their Order ID or phone number.`;

    // Gemini contents format: alternate user/model roles. Prepend system as a user turn.
    const contents = [
      { role: "user", parts: [{ text: fullSystem }] },
      { role: "model", parts: [{ text: "Understood. I will act as the DHONG GHAR customer care assistant." }] },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 300, topP: 0.9 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ reply: "I'm having trouble responding right now. Please try again in a moment or reach us via the contact details in the footer." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response for that. Could you rephrase?";

    return new Response(JSON.stringify({ reply: reply.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-chat error", err);
    return new Response(
      JSON.stringify({ reply: "Something went wrong on our end. Please try again or contact support via the footer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
