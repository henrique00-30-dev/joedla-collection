# Joedla Collection

Loja online responsiva desenvolvida com React Native, Expo, TypeScript e Supabase, preparada para publicação no Vercel.

O catálogo usa somente o banco online. Não existe acesso administrativo de demonstração nem senha embutida no código.

![Prévia da tela inicial](docs/joedla-home-mockup.png)

## Funcionalidades

### Cliente

- Catálogo por categorias administráveis.
- Pesquisa de produtos.
- Produtos à pronta entrega ou por encomenda.
- Escolha de tamanho, cor e quantidade.
- Favoritos.
- Carrinho.
- Compra sem cadastro.
- Entrega grátis em Rosário do Catete.
- Retirada combinada.
- Outras cidades combinadas pelo WhatsApp.
- Pix manual, cartão por link ou pagamento a combinar.
- Histórico dos pedidos feitos no aparelho.

### Administradora

- Login administrativo dentro do mesmo aplicativo.
- Resumo de produtos, estoque e pedidos.
- Cadastro e edição de produtos.
- Várias fotos por produto, com galeria de ângulos na página de detalhes.
- Criação, renomeação e exclusão de categorias.
- Dashboard de acessos anônimos, produtos mais vistos e mais comprados.
- Controle de estoque e produtos por encomenda.
- Atualização do andamento dos pedidos.
- Abertura do WhatsApp do cliente.
- Configuração do número da loja, chave Pix e retirada.

## Abrir no VS Code

Pré-requisitos:

- Node.js LTS instalado.
- VS Code.
- Aplicativo Expo Go no celular.

No terminal do VS Code:

```bash
npm install
npx expo start
```

Depois, leia o QR Code com o Expo Go.

Comandos úteis:

```bash
npm run typecheck
npm run lint
npm run web
```

## Configuração inicial no aplicativo

Entre na área administrativa e abra **Configurações** para cadastrar:

- WhatsApp da loja com DDD.
- Chave Pix.
- Endereço ou orientação para retirada.
- Instagram, caso queira informar.

Sem um WhatsApp configurado, os pedidos continuam sendo salvos, mas o botão para abrir a conversa avisa que falta cadastrar o número.

## Ativar o funcionamento online

Produtos, fotos, estoque, categorias e pedidos são compartilhados entre todos os aparelhos pelo Supabase.

> **Importante:** o Supabase já é o banco online escolhido para este projeto. Ele usa PostgreSQL internamente, por isso existe o arquivo `schema.sql`. Você não precisa instalar MySQL, SQL Server nem outro banco no computador; basta executar esse arquivo uma vez dentro do painel do Supabase.

1. Crie um projeto no Supabase.
2. No SQL Editor, execute [supabase/schema.sql](supabase/schema.sql).
3. Em **Authentication → Users**, crie a conta real da administradora.
4. No SQL Editor, transforme essa conta em administradora:

```sql
update public.profiles as profile
set role = 'admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('EMAIL_DA_ADMINISTRADORA');
```

5. Confirme em **Integrations → Data API** que o schema `public` está exposto. O arquivo SQL já concede apenas as permissões necessárias e ativa RLS em todas as tabelas.
6. Copie `.env.example` para um novo arquivo chamado `.env`.
7. Preencha somente a URL e a chave publicável:

```text
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

8. Reinicie o projeto:

```bash
npx expo start -c
```

Nunca coloque uma chave secreta ou `service_role` no aplicativo.

## Estrutura principal

```text
app/
  (tabs)/                 telas do cliente
  admin/                  painel administrativo
  category/               produtos de uma categoria
  product/                detalhes do produto
  checkout.tsx            finalização
  order-success.tsx       confirmação
src/
  components/             componentes visuais
  context/                estado e regras do aplicativo
  data/                   categorias e configurações iniciais
  lib/                    persistência e conexão
  services/               operações online
  utils/                  formatação e WhatsApp
supabase/
  schema.sql              banco e políticas de segurança
  add-dynamic-categories.sql  migração para categorias administráveis
  fix-product-duplicates.sql  correção segura de produtos duplicados
  add-store-analytics.sql     métricas anônimas e painel de desempenho
```

## Segurança

- O aplicativo utiliza somente chave publicável.
- A área administrativa online usa Supabase Auth.
- As autorizações ficam no banco, por meio de Row Level Security.
- Clientes podem criar pedidos, mas não conseguem ler pedidos de outras pessoas.
- Somente administradores podem modificar produtos, categorias, estoque, pedidos e configurações.
- Dados de cartão não são armazenados nem processados pelo aplicativo.

## Verificações realizadas

Execute `npm run typecheck`, `npm run lint` e `npm run export:web` antes de publicar.
