const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'app/admin/appearance.tsx');
if (!fs.existsSync(target)) {
  console.error('Não encontrei app/admin/appearance.tsx');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const backup = `${target}.bak-espacamento-banner`;
if (!fs.existsSync(backup)) fs.writeFileSync(backup, text, 'utf8');

function upsertStyle(name, values) {
  const re = new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  text = text.replace(re, (all, body) => {
    let next = body;
    for (const [key, value] of Object.entries(values)) {
      const prop = new RegExp(`\\n\\s*${key}:\\s*[^,]+,`, 'm');
      if (prop.test(next)) next = next.replace(prop, `\n    ${key}: ${value},`);
      else next += `\n    ${key}: ${value},`;
    }
    return `${name}: {${next}\n  },`;
  });
}

upsertStyle('destinationField', { marginTop: 'spacing.sm', marginBottom: 'spacing.xl', gap: 'spacing.md' });
upsertStyle('destinationKinds', { marginTop: 'spacing.xs', marginBottom: 'spacing.md', gap: 'spacing.md' });
upsertStyle('inlineActions', { marginTop: 'spacing.xl', marginBottom: 'spacing.xl', gap: 'spacing.md' });
upsertStyle('dateGrid', { marginTop: 'spacing.lg', marginBottom: 'spacing.xl', gap: 'spacing.xl' });
upsertStyle('bannerEditor', { gap: 'spacing.xl' });
upsertStyle('bannerPreviewColumn', { gap: 'spacing.lg' });
upsertStyle('bannerFields', { gap: 'spacing.lg' });
upsertStyle('fieldRow', { gap: 'spacing.lg' });
upsertStyle('destinationOptions', { marginTop: 'spacing.md', marginBottom: 'spacing.md', padding: 'spacing.lg', gap: 'spacing.md' });
upsertStyle('destinationOptionList', { paddingVertical: 'spacing.sm', gap: 'spacing.md' });

fs.writeFileSync(target, text, 'utf8');
console.log('✓ Espaçamento de Banners e campanhas corrigido.');
console.log('Backup criado em app/admin/appearance.tsx.bak-espacamento-banner');
