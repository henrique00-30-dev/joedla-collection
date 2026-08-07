const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const changed = [];
const notes = [];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function backupAndWrite(rel, next) {
  const full = path.join(ROOT, rel);
  const current = fs.readFileSync(full, 'utf8');

  if (current === next) {
    notes.push(`${rel}: nenhuma alteração necessária`);
    return;
  }

  const backup = `${full}.bak-sem-conta-cliente`;

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, current, 'utf8');
  }

  fs.writeFileSync(full, next, 'utf8');
  changed.push(rel);
}

function edit(rel, transform) {
  if (!exists(rel)) {
    notes.push(`${rel}: arquivo não encontrado`);
    return;
  }

  const full = path.join(ROOT, rel);
  const current = fs.readFileSync(full, 'utf8');
  const next = transform(current);
  backupAndWrite(rel, next);
}

// ---------------------------------------------------------
// 1) CABEÇALHO DA LOJA
// Remove o botão "Conta" ao lado de Favoritos/Carrinho.
// ---------------------------------------------------------
edit('src/components/app-header.tsx', (text) => {
  text = text.replace(
    /\s*<HeaderAction\s+icon="person-outline"\s+label="Conta"\s+onPress=\{\(\)\s*=>\s*router\.push\('\/account'\)\}\s*\/>\s*/m,
    '\n',
  );

  text = text.replace(
    /\s*<HeaderAction\s+icon="person-outline"\s+label="Minha conta"\s+onPress=\{\(\)\s*=>\s*router\.push\('\/account'\)\}\s*\/>\s*/m,
    '\n',
  );

  return text;
});

// ---------------------------------------------------------
// 2) MENU DO CLIENTE
// Remove linhas/cards que apontam para /account.
// Faz várias tentativas para cobrir versões diferentes.
// ---------------------------------------------------------
edit('app/(tabs)/menu.tsx', (text) => {
  text = text.replace(
    /\s*<Pressable[\s\S]*?router\.(?:push|replace)\('\/account'\)[\s\S]*?<\/Pressable>\s*/gm,
    '\n',
  );

  text = text.replace(
    /\s*\{\s*(?:label|title|name):\s*['"](?:Minha conta|Conta)['"][\s\S]*?(?:href|route|path):\s*['"]\/account['"][\s\S]*?\},?\s*/gm,
    '\n',
  );

  text = text.replace(
    /\s*\{\s*(?:href|route|path):\s*['"]\/account['"][\s\S]*?(?:label|title|name):\s*['"](?:Minha conta|Conta)['"][\s\S]*?\},?\s*/gm,
    '\n',
  );

  return text;
});

// ---------------------------------------------------------
// 3) RODAPÉ
// Remove eventual link para conta.
// ---------------------------------------------------------
edit('src/components/store-footer.tsx', (text) => {
  text = text.replace(
    /\s*<Pressable[\s\S]*?router\.(?:push|replace)\('\/account'\)[\s\S]*?<\/Pressable>\s*/gm,
    '\n',
  );

  text = text.replace(
    /\s*<Text[\s\S]*?>\s*(?:Minha conta|Conta)\s*<\/Text>\s*/gm,
    '\n',
  );

  return text;
});

// ---------------------------------------------------------
// 4) LAYOUT RAIZ
// Se houver registro explícito da rota account, remove.
// ---------------------------------------------------------
edit('app/_layout.tsx', (text) => {
  text = text.replace(
    /\s*<Stack\.Screen\s+name="account"[\s\S]*?\/>\s*/gm,
    '\n',
  );

  text = text.replace(
    /\s*<Stack\.Screen\s+name=['"]account['"][\s\S]*?<\/Stack\.Screen>\s*/gm,
    '\n',
  );

  return text;
});

// ---------------------------------------------------------
// 5) DESABILITA /account
// Mantém backup do arquivo completo para reativar no futuro.
// Quem digitar /account manualmente volta para a loja.
// ---------------------------------------------------------
if (exists('app/account.tsx')) {
  const disabledAccount = `import { Redirect } from 'expo-router';

export default function AccountDisabledScreen() {
  return <Redirect href="/" />;
}
`;

  backupAndWrite('app/account.tsx', disabledAccount);
}

// ---------------------------------------------------------
// 6) Limpeza extra: outros arquivos de UI conhecidos.
// Não mexe no painel administrativo.
// ---------------------------------------------------------
const optionalClientFiles = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/orders.tsx',
  'app/favorites.tsx',
];

for (const rel of optionalClientFiles) {
  edit(rel, (text) => {
    // Remove botões simples que tenham texto Conta/Minha conta
    // e naveguem especificamente para /account.
    text = text.replace(
      /\s*<Pressable[\s\S]*?router\.(?:push|replace)\('\/account'\)[\s\S]*?<\/Pressable>\s*/gm,
      '\n',
    );

    return text;
  });
}

console.log('');
console.log('CONTA DO CLIENTE REMOVIDA DA INTERFACE');
console.log('');

if (changed.length) {
  console.log('Arquivos alterados:');
  for (const file of changed) {
    console.log(`  ✓ ${file}`);
  }
}

if (notes.length) {
  console.log('');
  console.log('Observações:');
  for (const note of notes) {
    console.log(`  • ${note}`);
  }
}

console.log('');
console.log('A rota /account agora redireciona para a loja.');
console.log('O painel administrativo não foi alterado.');
console.log('');
console.log('Agora rode:');
console.log('  cmd /c npx tsc --noEmit');
console.log('');
console.log('Se ficar sem erros:');
console.log('  cmd /c npx expo start --web --clear');
