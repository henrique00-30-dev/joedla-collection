const fs = require('fs');
const path = require('path');

function read(rel) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Arquivo não encontrado: ${rel}`);
  }
  return fs.readFileSync(full, 'utf8');
}

function write(rel, content, backupSuffix) {
  const full = path.join(process.cwd(), rel);
  const backup = `${full}.${backupSuffix}`;

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, fs.readFileSync(full, 'utf8'), 'utf8');
  }

  fs.writeFileSync(full, content, 'utf8');
}

function replaceOnce(text, search, replacement, label) {
  if (!text.includes(search)) {
    throw new Error(`Não encontrei o trecho esperado em ${label}.`);
  }
  return text.replace(search, replacement);
}

// ---------------------------------------------------------
// 1) src/lib/supabase.ts
// Cria um segundo cliente Supabase com storageKey próprio.
// Assim admin e cliente podem ficar logados ao mesmo tempo no localhost.
// ---------------------------------------------------------

let supabaseFile = read('src/lib/supabase.ts');

if (!supabaseFile.includes('export const customerSupabase')) {
  supabaseFile += `

export const customerSupabase = isCloudConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: keyValueStorage,
        storageKey: 'joedla-customer-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
`;
}

write(
  'src/lib/supabase.ts',
  supabaseFile,
  'bak-conta-cliente',
);

// ---------------------------------------------------------
// 2) src/services/cloud.ts
// Faz loadCloudCustomerOrders aceitar o cliente de autenticação do consumidor.
// ---------------------------------------------------------

let cloudFile = read('src/services/cloud.ts');

cloudFile = cloudFile.replace(
  `export async function loadCloudCustomerOrders(): Promise<Order[]> {
  const client = requireClient();`,
  `export async function loadCloudCustomerOrders(
  clientOverride = supabase,
): Promise<Order[]> {
  const client = clientOverride;

  if (!client) {
    throw new Error('O banco online ainda não foi configurado.');
  }`,
);

write(
  'src/services/cloud.ts',
  cloudFile,
  'bak-conta-cliente',
);

// ---------------------------------------------------------
// 3) app/account.tsx
// Usa somente customerSupabase na área do cliente.
// Remove conflito com sessão administrativa.
// Mantém login por código.
// ---------------------------------------------------------

let accountFile = read('app/account.tsx');

accountFile = accountFile.replace(
  `import { supabase } from '@/src/lib/supabase';`,
  `import { customerSupabase } from '@/src/lib/supabase';`,
);

// Troca referências do cliente auth dentro desse arquivo.
accountFile = accountFile.replace(/\bsupabase\b/g, 'customerSupabase');

// Corrige eventual import transformado em duplicidade.
accountFile = accountFile.replace(
  `import { customerSupabase } from '@/src/lib/customerSupabase';`,
  `import { customerSupabase } from '@/src/lib/supabase';`,
);

// Garante que pedidos usem a sessão do cliente.
accountFile = accountFile.replace(
  `await loadCloudCustomerOrders()`,
  `await loadCloudCustomerOrders(customerSupabase)`,
);

// Remove texto de "sessão administrativa ativa", porque agora a conta
// do cliente tem sessão isolada da sessão do painel.
// Se o bloco existir, substitui por login normal quando necessário.
accountFile = accountFile.replace(
  `const [isAdminSession, setIsAdminSession] = useState(false);
`,
  ``,
);

accountFile = accountFile.replace(
  /setIsAdminSession\(false\);\s*/g,
  '',
);

// Remove consulta de role/admin, se o arquivo ainda tiver esse trecho.
accountFile = accountFile.replace(
  /const \{ data: profile \} = await customerSupabase[\s\S]*?setOrders\(\s*admin \? \[\] : await loadCloudCustomerOrders\(customerSupabase\),\s*\);/m,
  `setOrders(
        await loadCloudCustomerOrders(customerSupabase),
      );`,
);

// Remove o bloco visual "Sessão administrativa ativa".
accountFile = accountFile.replace(
  /\) : isAdminSession \? \([\s\S]*?\) : /m,
  `) : `,
);

// Ajusta textos para deixar claro que é conta do cliente.
accountFile = accountFile.replace(
  `Sua conta Joedla`,
  `Minha conta`,
);

accountFile = accountFile.replace(
  `Acompanhe pedidos, consulte seu histórico e acesse
            a loja sem precisar criar uma senha.`,
  `Entre com um código enviado por e-mail para acompanhar seus pedidos. Não é necessário criar senha.`,
);

// Remove emailRedirectTo para forçar experiência por código.
// O template do Supabase deve usar {{ .Token }}.
accountFile = accountFile.replace(
  /\s*emailRedirectTo:\s*'https:\/\/www\.joedla-collection\.com\.br\/account',?/g,
  '',
);

accountFile = accountFile.replace(
  `Confira seu e-mail. Use o link recebido ou digite o código de 6 números.`,
  `Confira seu e-mail e digite nesta tela o código de 6 números.`,
);

write(
  'app/account.tsx',
  accountFile,
  'bak-conta-cliente',
);

console.log('');
console.log('✓ Conta do cliente isolada da sessão administrativa.');
console.log('✓ Admin e cliente podem ficar logados ao mesmo tempo no localhost.');
console.log('✓ Login do cliente continua por código de 6 dígitos.');
console.log('');
console.log('Agora rode:');
console.log('  cmd /c npx tsc --noEmit');
console.log('');
console.log('Se não houver erros:');
console.log('  cmd /c npx expo start --web --clear');
