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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);

  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

async function sendEmail(email: string, code: string) {
  const fromEmail =
    Deno.env.get("LOGIN_FROM_EMAIL") ??
    "noreply@joedla-collection.com.br";

  const fromName =
    Deno.env.get("LOGIN_FROM_NAME") ??
    "Joedla Collection";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#2C211A">
      <h2>Seu código de acesso</h2>
      <p>Digite este código na tela da Joedla Collection:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:24px 0">
        ${code}
      </div>
      <p>O código expira em 5 minutos.</p>
      <p>Se você não solicitou este acesso, ignore este e-mail.</p>
    </div>
  `;

  const brevoKey = Deno.env.get("BREVO_API_KEY");

  if (brevoKey) {
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [{ email }],
          subject:
            "Seu código de acesso — Joedla Collection",
          htmlContent: html,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Brevo ${response.status}: ${await response.text()}`,
      );
    }

    const data = await response
      .json()
      .catch(() => ({}));

    return {
      provider: "brevo",
      id: data?.messageId ?? null,
    };
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (resendKey) {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject:
            "Seu código de acesso — Joedla Collection",
          html,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Resend ${response.status}: ${await response.text()}`,
      );
    }

    const data = await response
      .json()
      .catch(() => ({}));

    return {
      provider: "resend",
      id: data?.id ?? null,
    };
  }

  throw new Error(
    "Provedor de e-mail não configurado. Defina BREVO_API_KEY ou RESEND_API_KEY.",
  );
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

    if (
      !validEmail(email) ||
      email.length > 254
    ) {
      return json(
        { error: "E-mail inválido." },
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

    const fifteenMinutesAgo = new Date(
      Date.now() - 15 * 60 * 1000,
    ).toISOString();

    const { data: recent, error: recentError } =
      await admin
        .from("customer_login_codes")
        .select("created_at")
        .eq("email", email)
        .gte(
          "created_at",
          fifteenMinutesAgo,
        )
        .order("created_at", {
          ascending: false,
        });

    if (recentError) {
      throw recentError;
    }

    if ((recent?.length ?? 0) >= 5) {
      return json(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos.",
        },
        429,
      );
    }

    const lastCreated =
      recent?.[0]?.created_at
        ? new Date(
            recent[0].created_at,
          ).getTime()
        : 0;

    if (
      lastCreated &&
      Date.now() - lastCreated < 60_000
    ) {
      return json(
        {
          error:
            "Aguarde 60 segundos para solicitar outro código.",
        },
        429,
      );
    }

    const {
      data: linkData,
      error: linkError,
    } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError) {
      throw linkError;
    }

    const properties =
      linkData.properties as Record<
        string,
        unknown
      >;

    const tokenHash = String(
      properties.hashed_token ?? "",
    );

    if (!tokenHash) {
      throw new Error(
        "Supabase não retornou token_hash.",
      );
    }

    await admin
      .from("customer_login_codes")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("email", email)
      .is("used_at", null);

    const code = randomCode();

    const codeHash = await hmac(
      `${email}:${code}`,
      serviceKey,
    );

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000,
    ).toISOString();

    const {
      data: row,
      error: insertError,
    } = await admin
      .from("customer_login_codes")
      .insert({
        email,
        code_hash: codeHash,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    try {
      const delivery = await sendEmail(
        email,
        code,
      );

      await admin
        .from("customer_login_codes")
        .update({
          delivery_provider:
            delivery.provider,
          delivery_id: delivery.id,
        })
        .eq("id", row.id);
    } catch (emailError) {
      await admin
        .from("customer_login_codes")
        .delete()
        .eq("id", row.id);

      throw emailError;
    }

    return json({
      ok: true,
      expiresIn: 300,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o código.",
      },
      500,
    );
  }
});
