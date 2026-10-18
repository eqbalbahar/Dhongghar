import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth token" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Verify admin role via profile
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action as "change_password" | "change_email";

    if (action === "change_password") {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) return json({ error: "Missing fields" }, 400);
      if (newPassword.length < 8) return json({ error: "New password must be at least 8 characters" }, 400);

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return json({ error: "Current password is incorrect" }, 400);

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) return json({ error: updateError.message }, 400);

      return json({ success: true, message: "Password updated" }, 200);
    }

    if (action === "change_email") {
      const { currentPassword, newEmail } = body;
      if (!currentPassword || !newEmail) return json({ error: "Missing fields" }, 400);

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return json({ error: "Current password is incorrect" }, 400);

      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
      if (updateError) return json({ error: updateError.message }, 400);

      return json({ success: true, message: "Email updated" }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: "Server error" }, 500);
  }
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
