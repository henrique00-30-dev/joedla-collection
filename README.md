# Selo promocional persistente e responsivo

Este pacote conecta:

- painel administrativo;
- banco Supabase;
- cards públicos;
- página pública do produto;
- desktop, tablet e celular.

## Aplicação

Extraia este pacote na raiz do projeto e execute no PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\aplicar-selo-persistente.ps1
```

Depois valide:

```powershell
cmd /c npx tsc --noEmit
```

Se não houver erros, aplique a migration:

```powershell
npx supabase db push
```

Depois reinicie o Expo:

```powershell
cmd /c npx expo start --web --clear
```

## Teste funcional

1. Abra `/admin/promotions`.
2. Edite uma promoção.
3. Escolha posição, tamanho e formato.
4. Salve.
5. Reabra a promoção e confirme que os valores permaneceram.
6. Confira o card público e a página do produto.
7. Redimensione o navegador para desktop, tablet e celular.

O script cria backups com extensão `.bak-selo-visual` antes de substituir arquivos existentes.

<!-- production redeploy trigger 2026-08-08 -->
