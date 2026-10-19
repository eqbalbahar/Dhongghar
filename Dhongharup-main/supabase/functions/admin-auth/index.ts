import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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
    if (profile?.role !== "admin") return json({ error: "Forbidden — admin only" }, 403);

    let body: { action?: string; currentPassword?: string; newPassword?: string; newEmail?: string };
    try {
      body = await req.json();
    } catch (_e) {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const action = body.action;

    if (action === "change_password") {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) return json({ error: "Missing currentPassword or newPassword" }, 400);
      if (newPassword.length < 8) return json({ error: "New password must be at least 8 characters" }, 400);

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return json({ error: "Current password is incorrect" }, 400);

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) return json({ error: updateError.message }, 400);

      // Persist the new password + email to store_settings so the admin gate
      // can display/autofill the current demo credentials. The service role
      // client bypasses RLS to write these admin-only columns.
      try {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await adminClient
          .from("store_settings")
          .update({ admin_password: newPassword, admin_email: user.email!, email: user.email! })
          .eq("id", 1);
      } catch (_e) {
        // non-fatal — auth password was still updated successfully
      }

      return json({ success: true, message: "Password updated successfully" }, 200);
    }

    if (action === "change_email") {
      const { currentPassword, newEmail } = body;
      if (!currentPassword || !newEmail) return json({ error: "Missing currentPassword or newEmail" }, 400);
      if (!newEmail.includes("@")) return json({ error: "Invalid email address" }, 400);

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return json({ error: "Current password is incorrect" }, 400);

      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
      if (updateError) return json({ error: updateError.message }, 400);

      // Persist the new email (and current password) to store_settings so the
      // admin gate uses the updated email for subsequent logins.
      try {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await adminClient
          .from("store_settings")
          .update({ admin_email: newEmail, email: newEmail })
          .eq("id", 1);
      } catch (_e) {
        // non-fatal
      }

      return json({ success: true, message: "Email updated successfully" }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e?.message || "Server error" }, 500);
  }
});
