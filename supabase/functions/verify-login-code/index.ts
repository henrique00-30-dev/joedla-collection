import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
    },
  });
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

function safeEqual(first: string, second: string) {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Método não permitido." },
      405,
    );
  }

  try {
    const body = await request.json();

    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    const code = String(body?.code ?? "")
      .replace(/\D/g, "");

    if (
      !validEmail(email) ||
      email.length > 254
    ) {
      return json(
        { error: "E-mail inválido." },
        400,
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return json(
        {
          error:
            "Digite os 6 números do código.",
        },
        400,
      );
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const admin = createClient(
      url,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: row,
      error: queryError,
    } = await admin
      .from("customer_login_codes")
      .select(
        "id, code_hash, token_hash, expires_at, attempts, used_at",
      )
      .eq("email", email)
      .is("used_at", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      throw queryError;
    }

    if (!row || !row.token_hash) {
      return json(
        {
          error:
            "Código inválido ou expirado.",
        },
        400,
      );
    }

    if (
      new Date(row.expires_at).getTime() <
      Date.now()
    ) {
      await admin
        .from("customer_login_codes")
        .update({
          used_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      return json(
        {
          error:
            "Código expirado. Solicite um novo.",
        },
        400,
      );
    }

    if ((row.attempts ?? 0) >= 5) {
      return json(
        {
          error:
            "Muitas tentativas. Solicite um novo código.",
        },
        429,
      );
    }

    const candidateHash = await hmac(
      `${email}:${code}`,
      serviceKey,
    );

    if (
      !safeEqual(
        candidateHash,
        String(row.code_hash),
      )
    ) {
      await admin
        .from("customer_login_codes")
        .update({
          attempts:
            (row.attempts ?? 0) + 1,
        })
        .eq("id", row.id);

      return json(
        { error: "Código inválido." },
        400,
      );
    }

    await admin
      .from("customer_login_codes")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return json({
      ok: true,
      tokenHash: row.token_hash,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível validar o código.",
      },
      500,
    );
  }
});
