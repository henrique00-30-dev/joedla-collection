const fs = require('fs');
const path = require('path');

const rel = 'app/account.tsx';
const target = path.join(process.cwd(), rel);

if (!fs.existsSync(target)) {
  console.error(`Não encontrei ${rel}`);
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');

const backup = `${target}.bak-otp-final`;

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, 'utf8');
}

text = text.replace(
  "@customerSupabase/customerSupabase-js",
  "@supabase/supabase-js",
);

text = text.replace(
  "import { supabase } from '@/src/lib/supabase';",
  "import { customerSupabase } from '@/src/lib/supabase';",
);

text = text.replace(
  "import { customerSupabase } from '@/src/lib/customerSupabase';",
  "import { customerSupabase } from '@/src/lib/supabase';",
);

// Conserta o sendAccess atual.
const sendStart = text.indexOf(
  '  async function sendAccess() {',
);

const verifyStart = text.indexOf(
  '  async function verifyCode() {',
);

if (sendStart < 0 || verifyStart < 0) {
  console.error(
    'Não encontrei sendAccess/verifyCode em app/account.tsx',
  );
  process.exit(1);
}

const newSend = `  async function sendAccess() {
    if (
      !customerSupabase ||
      !isValidEmail(email)
    ) {
      Alert.alert(
        'E-mail inválido',
        'Informe um endereço de e-mail válido.',
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await customerSupabase.functions.invoke(
          'send-login-code',
          {
            body: {
              email: normalizeEmail(email),
            },
          },
        );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setCodeSent(true);
      setToken('');

      Alert.alert(
        'Código enviado',
        'Digite nesta tela o código de 6 números que chegou no seu e-mail.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível enviar',
        error instanceof Error
          ? error.message
          : 'Tente novamente em instantes.',
      );
    } finally {
      setLoading(false);
    }
  }

`;

text =
  text.slice(0, sendStart) +
  newSend +
  text.slice(verifyStart);

const verifyStart2 = text.indexOf(
  '  async function verifyCode() {',
);

const signOutStart = text.indexOf(
  '  async function signOut() {',
);

if (verifyStart2 < 0 || signOutStart < 0) {
  console.error(
    'Não encontrei verifyCode/signOut em app/account.tsx',
  );
  process.exit(1);
}

const newVerify = `  async function verifyCode() {
    if (
      !customerSupabase ||
      digitsOnly(token).length !== 6
    ) {
      Alert.alert(
        'Código incompleto',
        'Digite os 6 números recebidos por e-mail.',
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await customerSupabase.functions.invoke(
          'verify-login-code',
          {
            body: {
              email: normalizeEmail(email),
              code: digitsOnly(token),
            },
          },
        );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const tokenHash = data?.tokenHash;

      if (!tokenHash) {
        throw new Error(
          'O servidor não devolveu a autorização da conta.',
        );
      }

      const { error: sessionError } =
        await customerSupabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });

      if (sessionError) {
        throw sessionError;
      }

      setCodeSent(false);
      setToken('');

      await refreshAccount();
    } catch (error) {
      Alert.alert(
        'Código inválido',
        error instanceof Error
          ? error.message
          : 'Solicite um novo código.',
      );
    } finally {
      setLoading(false);
    }
  }

`;

text =
  text.slice(0, verifyStart2) +
  newVerify +
  text.slice(signOutStart);

// Garante que toda autenticação desta tela use a sessão cliente.
text = text.replace(
  /\bsupabase\.auth\./g,
  'customerSupabase.auth.',
);

text = text.replace(
  /\bsupabase\.functions\./g,
  'customerSupabase.functions.',
);

text = text.replace(
  /if \(!supabase\)/g,
  'if (!customerSupabase)',
);

// Pedidos devem usar a mesma sessão do consumidor.
// Se cloud.ts já foi adaptado, mantém o argumento.
text = text.replace(
  /loadCloudCustomerOrders\(\)/g,
  'loadCloudCustomerOrders(customerSupabase)',
);

fs.writeFileSync(target, text, 'utf8');

console.log('');
console.log('✓ app/account.tsx atualizado para OTP próprio.');
console.log('✓ Magic Link removido do fluxo da tela.');
console.log('');
console.log('Agora rode:');
console.log('  cmd /c npx tsc --noEmit');
