import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.111.0";

const allowedOrigins = new Set([
  "https://joedla-collection.com.br",
  "https://www.joedla-collection.com.br",
  "http://localhost:8081",
  "http://localhost:19006",
]);

const recoveryRedirect = "https://joedla-collection.com.br/account-reset";

function cors(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && (allowedOrigins.has(origin) || origin.endsWith('.vercel.app'))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value: string) {
  return value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);

  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim().replace(/\s+/g, " ");
    const whatsapp = String(body?.whatsapp ?? "").trim().slice(0, 30);

    if (!validEmail(email) || email.length > 254) return json({ error: "Informe um e-mail válido." }, 400, origin);
    if (fullName.length < 3 || fullName.length > 120) return json({ error: "Informe seu nome completo." }, 400, origin);
    if (!validPassword(password)) return json({ error: "A senha deve ter de 8 a 72 caracteres e incluir letras e números." }, 400, origin);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const emailHash = await hmac(email, serviceKey);
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("customer_registration_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", windowStart);
    if (countError) throw countError;
    if ((count ?? 0) >= 5) return json({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." }, 429, origin);

    const { error: attemptError } = await admin.from("customer_registration_attempts").insert({ email_hash: emailHash });
    if (attemptError) throw attemptError;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, whatsapp },
    });

    if (error) {
      const knownUser = /already|registered|exists/i.test(error.message);
      if (knownUser) {
        const publicAuth = createClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error: recoveryError } = await publicAuth.auth.resetPasswordForEmail(email, {
          redirectTo: recoveryRedirect,
        });
        if (recoveryError) console.error("customer recovery email failed", recoveryError);

        return json({
          error: recoveryError
            ? "Este e-mail já possui cadastro. Toque em Entrar ou tente a recuperação de acesso novamente em alguns minutos."
            : "Este e-mail já possui cadastro. Enviamos um e-mail seguro para você definir uma nova senha e recuperar o acesso.",
          existingAccount: true,
          recoverySent: !recoveryError,
        }, 200, origin);
      }
      return json({ error: "Não foi possível criar a conta. Tente novamente." }, 400, origin);
    }

    if (!data.user) throw new Error("Usuário não criado.");

    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: fullName, whatsapp, updated_at: new Date().toISOString() })
      .eq("id", data.user.id);
    if (profileError) throw profileError;

    return json({ ok: true }, 201, origin);
  } catch (error) {
    console.error(error);
    return json({ error: "Não foi possível criar a conta agora. Tente novamente." }, 500, origin);
  }
});
