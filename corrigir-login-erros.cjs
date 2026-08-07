const fs = require('fs');
const path = require('path');

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const p = full(rel);
  if (!fs.existsSync(p)) {
    throw new Error(`Arquivo não encontrado: ${rel}`);
  }
  return fs.readFileSync(p, 'utf8');
}

function write(rel, text) {
  const p = full(rel);
  const backup = `${p}.bak-login-fix`;

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(
      backup,
      fs.readFileSync(p, 'utf8'),
      'utf8',
    );
  }

  fs.writeFileSync(p, text, 'utf8');
}

// --------------------------------------------------
// 1) Corrige app/account.tsx
// --------------------------------------------------
let account = read('app/account.tsx');

account = account.replace(
  "@customerSupabase/customerSupabase-js",
  "@supabase/supabase-js",
);

// Se saveProfile sumiu no patch anterior, recria uma versão simples e segura.
// Ela só atualiza metadata do usuário; não altera o fluxo OTP.
if (
  account.includes('onPress={saveProfile}') &&
  !account.includes('async function saveProfile()')
) {
  const marker = '  async function signOut() {';

  const fn = `  async function saveProfile() {
    if (!customerSupabase || !user) {
      return;
    }

    const name =
      typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : '';

    if (!name.trim()) {
      Alert.alert(
        'Conta criada',
        'Seu acesso foi confirmado.',
      );
      return;
    }

    try {
      const { error } =
        await customerSupabase.auth.updateUser({
          data: {
            name: name.trim(),
          },
        });

      if (error) {
        throw error;
      }

      await refreshAccount();
    } catch (error) {
      Alert.alert(
        'Não foi possível atualizar',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    }
  }

`;

  if (!account.includes(marker)) {
    throw new Error(
      'Não encontrei o ponto para inserir saveProfile em app/account.tsx',
    );
  }

  account = account.replace(marker, fn + marker);
}

write('app/account.tsx', account);

// --------------------------------------------------
// 2) Exclui Edge Functions do TypeScript do app
//    Elas rodam em Deno e não devem entrar no tsc do Expo.
// --------------------------------------------------
const tsconfigPath = full('tsconfig.json');
const tsconfigRaw = fs.readFileSync(
  tsconfigPath,
  'utf8',
);

// Preserva JSON com comentários simples: faz patch textual.
let tsconfig = tsconfigRaw;

if (!tsconfig.includes('"supabase/functions/**"')) {
  if (/"exclude"\s*:\s*\[/.test(tsconfig)) {
    tsconfig = tsconfig.replace(
      /"exclude"\s*:\s*\[/,
      `"exclude": [\n    "supabase/functions/**",`,
    );
  } else {
    const lastBrace = tsconfig.lastIndexOf('}');

    if (lastBrace < 0) {
      throw new Error('tsconfig.json inválido.');
    }

    const before = tsconfig.slice(0, lastBrace).trimEnd();
    const needsComma = before.endsWith('}') || before.endsWith(']');

    tsconfig =
      before +
      (needsComma ? ',\n' : '\n') +
      `  "exclude": ["supabase/functions/**"]\n}` +
      tsconfig.slice(lastBrace + 1);
  }

  fs.writeFileSync(
    `${tsconfigPath}.bak-login-fix`,
    tsconfigRaw,
    'utf8',
  );

  fs.writeFileSync(
    tsconfigPath,
    tsconfig,
    'utf8',
  );
}

console.log('');
console.log('✓ account.tsx corrigido.');
console.log('✓ Edge Functions removidas do typecheck do Expo.');
console.log('');
console.log('Agora rode:');
console.log('  cmd /c npx tsc --noEmit');
