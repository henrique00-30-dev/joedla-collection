# Checkup geral — 08/08/2026

## Escopo

Auditoria de responsividade, ações, integração cliente/painel, Supabase e deploy, preservando a arquitetura e os serviços gratuitos existentes.

## Breakpoints revisados

- Celular: largura abaixo de 600 px.
- Tablet: 600 a 1023 px.
- Desktop: 1024 px ou superior.

## Correções de interface

- Relatório financeiro: cards e gráficos empilham em celular/tablet e respeitam 100% da largura disponível.
- Relatórios de pedidos e produtos/estoque: dashboards empilham em celular/tablet; textos e valores não extrapolam o card.
- `AdminCard`: largura máxima limitada ao contêiner; cabeçalho e ações quebram linha no celular.
- `AdminSection`: título, descrição e ações passam a empilhar em telas estreitas.
- Componente global `Button`: permite redução dentro de linhas estreitas (`flexShrink`) e mantém área de toque mínima de 50 px.
- Exportação dos relatórios: botões ficam em coluna no celular.
- Tabelas administrativas largas permanecem em `ScrollView` horizontal deliberado, sem forçar o restante da página a ultrapassar a viewport.

## Ações e navegação

- Busca por handlers vazios (`onPress={() => {}}`): nenhum encontrado.
- Busca por `TODO`, `FIXME`, `href="#"` e `localhost` em código ativo: nenhum resultado relevante encontrado.
- Confirmações destrutivas no Web continuam protegidas por confirmação compatível com navegador.
- Remoção de cupom já utiliza confirmação compatível com tablet/navegador e feedback de sucesso/erro.

## Integração cliente ↔ painel

- Pedido público é persistido no Supabase e o painel lê a mesma tabela `orders`.
- A tela pública “Meus pedidos” sincroniza status pelo `lookup_token` ao receber foco.
- Produtos, categorias, configurações e marketing são recarregados da fonte online pelo StoreProvider.
- Cadastro/login do Clube e resumo do cliente usam as RPCs do Supabase; pagamentos/pontos permanecem derivados da mesma fonte de dados.
- Corrigido loop de atualização do relatório de pedidos que podia disparar várias leituras consecutivas de `/orders`.

## Supabase

Migration aplicada em produção e registrada no repositório: `restrict_admin_delete_rpcs`.

Resultado de permissões após a correção:

- `admin_delete_cancelled_order(uuid)`: anon = sem EXECUTE; authenticated = EXECUTE.
- `club_admin_delete_customer(uuid)`: anon = sem EXECUTE; authenticated = EXECUTE.

Checks de integridade:

- Telefones duplicados em `store_customers`: 0.
- Telefones ativos duplicados no Clube: 0.
- Totais inválidos de pedidos ativos: 0.
- Transações financeiras órfãs: 0.
- Links de cliente quebrados nos pedidos ativos: 0.

Teste de criação de pedido como `anon` executado dentro de transação com `ROLLBACK`: sucesso; nenhum pedido ou baixa de estoque de teste persistiu.

Teste de cadastro + login do Clube como `anon` executado dentro de transação com `ROLLBACK`: sucesso; nenhum cliente de teste persistiu.

## Logs

A API do Supabase apresentava leituras repetidas de `/orders` em curto intervalo. A causa foi tratada no relatório de pedidos ao estabilizar a função de atualização durante o foco da tela.

As requisições recentes de catálogo, marketing e relatório financeiro observadas no checkup retornaram HTTP 200.

## Publicação

As alterações foram preparadas na branch `audit/responsividade-geral-20260808`. A `main` deve ser atualizada apenas após o preview da Vercel concluir sem erro.
