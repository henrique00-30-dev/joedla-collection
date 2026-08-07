const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const changed = [];
const notes = [];

function full(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(full(rel));
}

function save(rel, next) {
  const target = full(rel);

  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, next, 'utf8');
    changed.push(rel);
    return;
  }

  const current = fs.readFileSync(target, 'utf8');

  if (current === next) {
    notes.push(`${rel}: já estava correto`);
    return;
  }

  const backup = `${target}.bak-pre-entrega`;

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, current, 'utf8');
  }

  fs.writeFileSync(target, next, 'utf8');
  changed.push(rel);
}

function edit(rel, transform) {
  if (!exists(rel)) {
    notes.push(`${rel}: arquivo não encontrado`);
    return;
  }

  const current = fs.readFileSync(full(rel), 'utf8');
  save(rel, transform(current));
}

// 1) Remove registro da rota de conta, se ainda existir.
edit('app/_layout.tsx', (text) =>
  text.replace(
    /\s*<Stack\.Screen\s+name=["']account["']\s*\/>\s*/g,
    '\n',
  ),
);

// 2) Remove botão Conta do cabeçalho, se ainda existir,
// e melhora acessibilidade dos botões principais.
edit('src/components/app-header.tsx', (text) => {
  text = text.replace(
    /\n\s*<HeaderAction\s*\n\s*icon="person-outline"\s*\n\s*label="Conta"\s*\n\s*onPress=\{\(\) => router\.push\('\/account'\)\}\s*\n\s*\/>\s*/g,
    '\n',
  );

  text = text.replace(
    `<Pressable
      accessibilityLabel={label}`,
    `<Pressable
      accessibilityRole="button"
      accessibilityLabel={label}`,
  );

  text = text.replace(
    `<Pressable
      accessibilityLabel="Abrir carrinho"`,
    `<Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir carrinho"`,
  );

  return text;
});

// 3) SEO básico para Web.
if (!exists('app/+html.tsx')) {
  save(
    'app/+html.tsx',
    `import type { PropsWithChildren } from 'react';

export default function Root({
  children,
}: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="Joedla Collection — moda, acessórios e novidades selecionadas para você."
        />
        <meta
          name="theme-color"
          content="#FFFDF9"
        />
        <meta
          name="robots"
          content="index,follow"
        />
        <title>Joedla Collection</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
`,
  );
} else {
  notes.push('app/+html.tsx: já existe; não foi sobrescrito');
}

// 4) Auditoria textual pré-entrega.
const audit = `const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'src'];
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(target));
    } else if (
      /\\.(ts|tsx|js|jsx)$/.test(entry.name) &&
      !entry.name.includes('.bak-')
    ) {
      result.push(target);
    }
  }

  return result;
}

const files = SOURCE_DIRS.flatMap((dir) =>
  walk(path.join(ROOT, dir)),
);

for (const filename of files) {
  const rel = path.relative(ROOT, filename);
  const text = fs.readFileSync(filename, 'utf8');

  const checks = [
    {
      regex: /localhost:\\\\d+/g,
      label: 'referência a localhost',
      allow: rel === 'app/account.tsx',
    },
    {
      regex: /TODO|FIXME/g,
      label: 'TODO/FIXME pendente',
    },
    {
      regex: /router\\.(push|replace)\\(['"]\\/account['"]\\)/g,
      label: 'link ainda apontando para /account',
    },
  ];

  for (const check of checks) {
    if (check.allow) continue;

    const matches = text.match(check.regex);

    if (matches?.length) {
      findings.push(
        rel + ': ' + check.label + ' (' + matches.length + ')',
      );
    }
  }
}

console.log('');
console.log('AUDITORIA PRE-ENTREGA — JOEDLA');
console.log('');

if (!findings.length) {
  console.log('✓ Nenhum alerta textual encontrado.');
} else {
  console.log('Revise estes pontos:');
  findings.forEach((item) => console.log('  • ' + item));
}

console.log('');
console.log('Checklist manual obrigatório:');
console.log('  1. Home -> categoria -> produto');
console.log('  2. Favoritos');
console.log('  3. Carrinho -> quantidade -> remover');
console.log('  4. Checkout -> criar pedido');
console.log('  5. Painel -> produtos -> categorias -> pedidos');
console.log('  6. Banner/campanha -> destino correto');
console.log('  7. WhatsApp / Instagram / Pix');
console.log('  8. Mobile 360px, tablet 768px, desktop');
`;

save('scripts/auditar-pre-entrega.cjs', audit);

// 5) Adiciona scripts npm.
if (exists('package.json')) {
  const packagePath = full('package.json');
  const current = fs.readFileSync(packagePath, 'utf8');

  try {
    const pkg = JSON.parse(current);
    pkg.scripts = pkg.scripts ?? {};
    pkg.scripts['audit:release'] =
      'node scripts/auditar-pre-entrega.cjs';
    pkg.scripts['check:release'] =
      'npm run typecheck && npm run audit:release';

    save('package.json', JSON.stringify(pkg, null, 2) + '\n');
  } catch {
    notes.push(
      'package.json: não foi alterado porque não pôde ser lido como JSON',
    );
  }
}

console.log('');
console.log('POLIMENTO PRE-ENTREGA APLICADO');
console.log('');

changed.forEach((rel) => console.log('  ✓ ' + rel));

if (notes.length) {
  console.log('');
  console.log('Observações:');
  notes.forEach((note) => console.log('  • ' + note));
}

console.log('');
console.log('Agora rode:');
console.log('  cmd /c npm run check:release');
console.log('');
console.log('Se não houver erro de TypeScript:');
console.log('  cmd /c npx expo start --web --clear');
