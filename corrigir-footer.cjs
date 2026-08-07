const fs = require('fs');
const path = require('path');

const root = process.cwd();
const footer = path.join(root, 'src/components/store-footer.tsx');
const backup = `${footer}.bak-sem-conta-cliente`;

if (!fs.existsSync(footer)) {
  console.error('Não encontrei src/components/store-footer.tsx');
  process.exit(1);
}

if (!fs.existsSync(backup)) {
  console.error(
    'Não encontrei o backup src/components/store-footer.tsx.bak-sem-conta-cliente',
  );
  console.error(
    'Pare aqui e me envie o conteúdo atual de src/components/store-footer.tsx.',
  );
  process.exit(1);
}

// Restaura o rodapé completo porque o patch anterior removeu JSX demais.
const original = fs.readFileSync(backup, 'utf8');
fs.writeFileSync(footer, original, 'utf8');

console.log('');
console.log('✓ Rodapé restaurado a partir do backup.');
console.log('✓ Nenhuma alteração foi feita no painel administrativo.');
console.log('');
console.log('Agora rode:');
console.log('  cmd /c npx tsc --noEmit');
console.log('');
console.log('Se não houver erros:');
console.log('  cmd /c npx expo start --web --clear');
