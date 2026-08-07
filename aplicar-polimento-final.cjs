const fs = require('fs');
const path = require('path');

const root = process.cwd();
const touched = [];
const warnings = [];

function file(rel) {
  return path.join(root, rel);
}

function edit(rel, transform) {
  const full = file(rel);

  if (!fs.existsSync(full)) {
    warnings.push(`Arquivo não encontrado: ${rel}`);
    return;
  }

  const before = fs.readFileSync(full, 'utf8');
  const after = transform(before);

  if (after === before) {
    warnings.push(`Nenhuma alteração necessária em: ${rel}`);
    return;
  }

  const backup = `${full}.bak-polimento-final`;
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, before, 'utf8');
  }

  fs.writeFileSync(full, after, 'utf8');
  touched.push(rel);
}

function replace(text, search, replacement) {
  return text.replace(search, replacement);
}

function replaceRegex(text, regex, replacement) {
  return text.replace(regex, replacement);
}

// 1) HOME — deixar apenas a pesquisa do cabeçalho.
edit('app/(tabs)/index.tsx', (text) => {
  text = replaceRegex(
    text,
    /\nimport \{ SearchBar \} from '@\/src\/components\/search-bar';\n/,
    '\n',
  );

  text = replaceRegex(
    text,
    /\n\s*<View\s+style=\{\[\s*styles\.pageWidth,\s*styles\.horizontalPadding,\s*styles\.searchArea,\s*\]\}>\s*<SearchBar[\s\S]*?<\/View>\s*/m,
    '\n',
  );

  text = replaceRegex(
    text,
    /\n\s*searchArea:\s*\{\s*paddingTop:\s*spacing\.md,\s*\},?/m,
    '\n',
  );

  text = replaceRegex(
    text,
    /heroArea:\s*\{\s*marginTop:\s*[^,]+,\s*\}/m,
    "heroArea: {\n    marginTop: 18,\n  }",
  );

  text = replaceRegex(
    text,
    /marketingHero:\s*\{\s*marginTop:\s*[^,]+,\s*\}/m,
    "marketingHero: {\n    marginTop: 18,\n  }",
  );

  text = replaceRegex(
    text,
    /section:\s*\{\s*marginTop:\s*[^,]+,\s*paddingHorizontal:\s*spacing\.lg,\s*\}/m,
    "section: {\n    marginTop: 28,\n    paddingHorizontal: spacing.lg,\n  }",
  );

  return text;
});

// 2) CABEÇALHO DA LOJA — alinhamento e respiro.
edit('src/components/app-header.tsx', (text) => {
  text = replaceRegex(
    text,
    /maxWidth:\s*1280,/g,
    'maxWidth: 1200,',
  );

  text = replaceRegex(
    text,
    /desktopPrimaryRow:\s*\{([\s\S]*?)minHeight:\s*94,/m,
    (match, middle) =>
      `desktopPrimaryRow: {${middle}minHeight: 100,`,
  );

  text = replaceRegex(
    text,
    /searchShell:\s*\{([\s\S]*?)maxWidth:\s*560,([\s\S]*?)minHeight:\s*48,/m,
    (match, a, b) =>
      `searchShell: {${a}maxWidth: 600,${b}minHeight: 50,`,
  );

  text = replaceRegex(
    text,
    /desktopActions:\s*\{([\s\S]*?)gap:\s*spacing\.xs,/m,
    (match, a) =>
      `desktopActions: {${a}gap: spacing.sm,`,
  );

  text = replaceRegex(
    text,
    /headerAction:\s*\{([\s\S]*?)minWidth:\s*72,([\s\S]*?)minHeight:\s*56,/m,
    (match, a, b) =>
      `headerAction: {${a}minWidth: 78,${b}minHeight: 58,`,
  );

  text = replaceRegex(
    text,
    /desktopNav:\s*\{([\s\S]*?)minHeight:\s*50,/m,
    (match, a) =>
      `desktopNav: {${a}minHeight: 54,`,
  );

  text = replaceRegex(
    text,
    /navItem:\s*\{([\s\S]*?)minHeight:\s*50,/m,
    (match, a) =>
      `navItem: {${a}minHeight: 54,`,
  );

  return text;
});

// 3) MENU ADMIN — mais largo e legível + banners/campanhas em um só caminho.
edit('app/admin/_layout.tsx', (text) => {
  // Remove item separado Campanhas do menu.
  text = replaceRegex(
    text,
    /\s*\{\s*label:\s*'Campanhas',\s*icon:\s*'megaphone-outline',\s*href:\s*'\/admin\/campaigns',\s*\},?/m,
    '',
  );

  text = text.replace(
    "label: 'Aparência da loja',",
    "label: 'Banners e campanhas',",
  );

  // Troca só o ícone da opção renomeada, quando estiver imediatamente antes.
  text = replaceRegex(
    text,
    /\{\s*label:\s*'Banners e campanhas',\s*icon:\s*'color-palette-outline',/m,
    "{\n        label: 'Banners e campanhas',\n        icon: 'images-outline',",
  );

  text = replaceRegex(
    text,
    /sidebar:\s*\{([\s\S]*?)width:\s*\d+,([\s\S]*?)minWidth:\s*\d+,([\s\S]*?)maxWidth:\s*\d+,/m,
    (m, a, b, c) =>
      `sidebar: {${a}width: 190,${b}minWidth: 190,${c}maxWidth: 190,`,
  );

  text = replaceRegex(
    text,
    /sidebarMobile:\s*\{([\s\S]*?)width:\s*\d+,([\s\S]*?)minWidth:\s*\d+,([\s\S]*?)maxWidth:\s*\d+,/m,
    (m, a, b, c) =>
      `sidebarMobile: {${a}width: 274,${b}minWidth: 274,${c}maxWidth: 274,`,
  );

  text = replaceRegex(
    text,
    /groupTitle:\s*\{([\s\S]*?)fontSize:\s*[\d.]+,/m,
    (m, a) =>
      `groupTitle: {${a}fontSize: 9,`,
  );

  text = replaceRegex(
    text,
    /menuItem:\s*\{([\s\S]*?)minHeight:\s*\d+,/m,
    (m, a) =>
      `menuItem: {${a}minHeight: 36,`,
  );

  text = replaceRegex(
    text,
    /menuLabel:\s*\{([\s\S]*?)fontSize:\s*[\d.]+,/m,
    (m, a) =>
      `menuLabel: {${a}fontSize: 12,`,
  );

  text = replaceRegex(
    text,
    /signOutText:\s*\{([\s\S]*?)fontSize:\s*[\d.]+,/m,
    (m, a) =>
      `signOutText: {${a}fontSize: 12,`,
  );

  // Ícone dos itens do menu.
  text = replaceRegex(
    text,
    /name=\{item\.icon\}\s*size=\{\d+\}/g,
    "name={item.icon}\n                        size={17}",
  );

  return text;
});

// 4) PÁGINAS ADMIN — espaçamento geral profissional.
edit('src/components/admin/admin-page.tsx', (text) => {
  text = replaceRegex(
    text,
    /content:\s*\{([\s\S]*?)padding:\s*16,([\s\S]*?)paddingBottom:\s*40,/m,
    (m, a, b) =>
      `content: {${a}padding: 20,${b}paddingBottom: 48,`,
  );

  text = replaceRegex(
    text,
    /contentCompact:\s*\{([\s\S]*?)padding:\s*12,/m,
    (m, a) =>
      `contentCompact: {${a}padding: 14,`,
  );

  text = replaceRegex(
    text,
    /header:\s*\{([\s\S]*?)minHeight:\s*58,/m,
    (m, a) =>
      `header: {${a}minHeight: 64,`,
  );

  text = replaceRegex(
    text,
    /body:\s*\{\s*marginTop:\s*16,\s*gap:\s*spacing\.md,\s*\}/m,
    "body: {\n    marginTop: 20,\n    gap: 20,\n  }",
  );

  return text;
});

// 5) TOOLBARS E BOTÕES ADMIN — áreas de clique e distâncias.
edit('src/components/admin/admin-toolbar.tsx', (text) => {
  text = replaceRegex(
    text,
    /toolbar:\s*\{([\s\S]*?)minHeight:\s*54,([\s\S]*?)padding:\s*spacing\.sm,/m,
    (m, a, b) =>
      `toolbar: {${a}minHeight: 60,${b}padding: 12,`,
  );

  text = replaceRegex(
    text,
    /search:\s*\{([\s\S]*?)minHeight:\s*38,/m,
    (m, a) =>
      `search: {${a}minHeight: 42,`,
  );

  text = replaceRegex(
    text,
    /button:\s*\{([\s\S]*?)minHeight:\s*36,/m,
    (m, a) =>
      `button: {${a}minHeight: 40,`,
  );

  text = replaceRegex(
    text,
    /buttonText:\s*\{([\s\S]*?)fontSize:\s*10,/m,
    (m, a) =>
      `buttonText: {${a}fontSize: 11,`,
  );

  text = replaceRegex(
    text,
    /filterChip:\s*\{([\s\S]*?)minHeight:\s*32,/m,
    (m, a) =>
      `filterChip: {${a}minHeight: 36,`,
  );

  return text;
});

// 6) CARDS ADMIN — separar títulos, ações e conteúdo.
edit('src/components/admin/admin-card.tsx', (text) => {
  text = replaceRegex(
    text,
    /cardCompact:\s*\{([\s\S]*?)padding:\s*spacing\.md,/m,
    (m, a) =>
      `cardCompact: {${a}padding: 14,`,
  );

  text = replaceRegex(
    text,
    /header:\s*\{([\s\S]*?)gap:\s*spacing\.md,/m,
    (m, a) =>
      `header: {${a}gap: 16,`,
  );

  text = replaceRegex(
    text,
    /body:\s*\{\s*marginTop:\s*spacing\.lg,\s*\}/m,
    "body: {\n    marginTop: 18,\n  }",
  );

  text = replaceRegex(
    text,
    /bodyCompact:\s*\{\s*marginTop:\s*spacing\.md,\s*\}/m,
    "bodyCompact: {\n    marginTop: 14,\n  }",
  );

  return text;
});

// 7) UI COMUM — mais distância entre label/campo sem alterar tipografia principal.
edit('src/components/ui.tsx', (text) => {
  text = replaceRegex(
    text,
    /fieldGroup:\s*\{\s*gap:\s*6,\s*\}/m,
    "fieldGroup: {\n    gap: 8,\n  }",
  );

  return text;
});

// 8) BANNERS E CAMPANHAS — corrigir proximidade dos controles.
edit('app/admin/appearance.tsx', (text) => {
  text = text.replace(
    'title="Aparência da loja"',
    'title="Banners e campanhas"',
  );

  text = text.replace(
    'description="Edite o banner principal e o carrossel exibido na página inicial."',
    'description="Gerencie o banner principal, banners extras e campanhas que ocupam o mesmo carrossel da loja."',
  );

  text = replaceRegex(
    text,
    /dateGrid:\s*\{([\s\S]*?)gap:\s*spacing\.md,/m,
    (m, a) =>
      `dateGrid: {${a}gap: spacing.lg,`,
  );

  text = replaceRegex(
    text,
    /bannerEditor:\s*\{([\s\S]*?)gap:\s*spacing\.lg,/m,
    (m, a) =>
      `bannerEditor: {${a}gap: spacing.xl,`,
  );

  text = replaceRegex(
    text,
    /bannerFields:\s*\{([\s\S]*?)gap:\s*spacing\.md,/m,
    (m, a) =>
      `bannerFields: {${a}gap: spacing.lg,`,
  );

  text = replaceRegex(
    text,
    /fieldRow:\s*\{([\s\S]*?)gap:\s*spacing\.md,/m,
    (m, a) =>
      `fieldRow: {${a}gap: spacing.lg,`,
  );

  text = replaceRegex(
    text,
    /destinationKinds:\s*\{([\s\S]*?)gap:\s*spacing\.sm,/m,
    (m, a) =>
      `destinationKinds: {${a}gap: spacing.md,`,
  );

  text = replaceRegex(
    text,
    /destinationOptions:\s*\{([\s\S]*?)padding:\s*spacing\.md,([\s\S]*?)gap:\s*spacing\.sm,/m,
    (m, a, b) =>
      `destinationOptions: {${a}padding: spacing.lg,${b}gap: spacing.md,`,
  );

  text = replaceRegex(
    text,
    /destinationOptionList:\s*\{([\s\S]*?)gap:\s*spacing\.sm,/m,
    (m, a) =>
      `destinationOptionList: {${a}gap: spacing.md,`,
  );

  text = replaceRegex(
    text,
    /footerActions:\s*\{\s*alignItems:\s*'flex-end',\s*\}/m,
    "footerActions: {\n    marginTop: spacing.lg,\n    alignItems: 'flex-end',\n  }",
  );

  return text;
});

console.log('\nPOLIMENTO FINAL APLICADO\n');

if (touched.length) {
  console.log('Arquivos alterados:');
  touched.forEach((rel) => console.log(`  ✓ ${rel}`));
}

if (warnings.length) {
  console.log('\nObservações:');
  warnings.forEach((item) => console.log(`  • ${item}`));
}

console.log('\nPróximo comando:');
console.log('  cmd /c npx tsc --noEmit');
console.log('\nSe não houver erros:');
console.log('  cmd /c npx expo start --web --clear');
