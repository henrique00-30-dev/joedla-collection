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

function save(rel, text) {
  const p = full(rel);
  const backup = `${p}.bak-fix-v2`;

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(
      backup,
      fs.readFileSync(p, 'utf8'),
      'utf8',
    );
  }

  fs.writeFileSync(p, text, 'utf8');
}

function upsertStyle(text, name, values) {
  const regex = new RegExp(
    `${name}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`,
    'm',
  );

  if (!regex.test(text)) {
    console.log(`  • estilo não encontrado: ${name}`);
    return text;
  }

  return text.replace(regex, (match, body) => {
    let next = body;

    for (const [key, value] of Object.entries(values)) {
      const prop = new RegExp(
        `\\n\\s*${key}:\\s*[^,]+,`,
        'm',
      );

      if (prop.test(next)) {
        next = next.replace(
          prop,
          `\n    ${key}: ${value},`,
        );
      } else {
        next += `\n    ${key}: ${value},`;
      }
    }

    return `${name}: {${next}\n  },`;
  });
}

console.log('\nCORRIGINDO CONTA DO CLIENTE...\n');

// ---------------------------------------------------------
// 1) account.tsx — corrige import quebrado pelo patch anterior
// ---------------------------------------------------------
let account = read('app/account.tsx');

account = account.replace(
  "@customerSupabase/customerSupabase-js",
  "@supabase/supabase-js",
);

account = account.replace(
  "import { customerSupabase } from '@/src/lib/customerSupabase';",
  "import { customerSupabase } from '@/src/lib/supabase';",
);

if (
  !account.includes(
    "import { customerSupabase } from '@/src/lib/supabase';",
  )
) {
  account = account.replace(
    "import { Screen } from '@/src/components/screen';",
    "import { Screen } from '@/src/components/screen';\nimport { customerSupabase } from '@/src/lib/supabase';",
  );
}

account = account.replace(
  /await loadCloudCustomerOrders\(\s*customerSupabase\s*\)/g,
  'await loadCloudCustomerOrders(customerSupabase)',
);

save('app/account.tsx', account);

// ---------------------------------------------------------
// 2) supabase.ts — garante cliente separado para consumidor
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

save('src/lib/supabase.ts', supabaseFile);

// ---------------------------------------------------------
// 3) cloud.ts — permite carregar pedidos usando sessão cliente
// ---------------------------------------------------------
let cloud = read('src/services/cloud.ts');

const oldSignature =
  /export async function loadCloudCustomerOrders\(\): Promise<Order\[\]> \{\s*const client = requireClient\(\);/m;

const oldSignatureNoSpace =
  /export async function loadCloudCustomerOrders\(\): Promise<Order\[\]>\s*\{\s*const client = requireClient\(\);/m;

const replacement = `export async function loadCloudCustomerOrders(
  clientOverride = supabase,
): Promise<Order[]> {
  const client = clientOverride;

  if (!client) {
    throw new Error('O banco online ainda não foi configurado.');
  }`;

if (oldSignature.test(cloud)) {
  cloud = cloud.replace(oldSignature, replacement);
} else if (oldSignatureNoSpace.test(cloud)) {
  cloud = cloud.replace(oldSignatureNoSpace, replacement);
} else if (
  !cloud.includes('clientOverride = supabase')
) {
  console.log(
    '  ! não consegui localizar automaticamente loadCloudCustomerOrders; confira o arquivo se o TypeScript ainda reclamar.',
  );
}

save('src/services/cloud.ts', cloud);

console.log('✓ Conta corrigida.');
console.log('');
console.log('CORRIGINDO ESPAÇAMENTO DE BANNERS E CAMPANHAS...\n');

// ---------------------------------------------------------
// 4) appearance.tsx — aumenta respiro entre grupos
// ---------------------------------------------------------
let appearance = read('app/admin/appearance.tsx');

appearance = upsertStyle(
  appearance,
  'destinationField',
  {
    marginTop: 'spacing.sm',
    marginBottom: '28',
    gap: '16',
  },
);

appearance = upsertStyle(
  appearance,
  'destinationKinds',
  {
    marginTop: '6',
    marginBottom: '22',
    gap: '14',
  },
);

appearance = upsertStyle(
  appearance,
  'destinationOptions',
  {
    marginTop: '14',
    marginBottom: '18',
    padding: 'spacing.lg',
    gap: '14',
  },
);

appearance = upsertStyle(
  appearance,
  'destinationOptionList',
  {
    paddingVertical: '8',
    gap: '12',
  },
);

appearance = upsertStyle(
  appearance,
  'imageButton',
  {
    marginTop: '12',
    marginBottom: '18',
  },
);

appearance = upsertStyle(
  appearance,
  'inlineActions',
  {
    marginTop: '18',
    marginBottom: '22',
    gap: '14',
  },
);

appearance = upsertStyle(
  appearance,
  'dateGrid',
  {
    marginTop: '16',
    marginBottom: '24',
    gap: '24',
  },
);

appearance = upsertStyle(
  appearance,
  'bannerEditor',
  {
    gap: '24',
  },
);

appearance = upsertStyle(
  appearance,
  'bannerPreviewColumn',
  {
    gap: '18',
  },
);

appearance = upsertStyle(
  appearance,
  'bannerFields',
  {
    gap: '20',
  },
);

appearance = upsertStyle(
  appearance,
  'fieldRow',
  {
    gap: '22',
  },
);

appearance = upsertStyle(
  appearance,
  'footerActions',
  {
    marginTop: '24',
  },
);

save('app/admin/appearance.tsx', appearance);

console.log('✓ Espaçamento aumentado.');
console.log('');
console.log('PRÓXIMO PASSO');
console.log('  cmd /c npx tsc --noEmit');
console.log('');
console.log('Se ficar sem erros:');
console.log('  cmd /c npx expo start --web --clear');
