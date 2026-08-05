# Auditoria — Refinamento do Marketing Inteligente

Data da auditoria: 05/08/2026  
Branch base: `main`  
Commit inicial: `eec1baec4f8417f36a9d61c3dc22f9294b3fd662`  
Branch de trabalho: `agent/joedla-marketing-promocoes-campos`

## Fatos confirmados

- O catálogo, o painel e o checkout são um aplicativo Expo Router/React Native Web com Supabase.
- A produção tinha 46 produtos, 7 pedidos, 4 campanhas e 45 entradas de auditoria antes desta tarefa.
- As migrations `marketing_visual_foundation` e `marketing_promotions_and_trusted_orders` já estavam aplicadas.
- O banco já calculava campanhas e criava pedidos por RPC atômica, mas não conhecia promoção individual.
- O frontend já usava o preço resolvido para catálogo, produto, relacionados, favoritos, carrinho e checkout.
- Pedidos guardam itens e snapshot em JSON; não existe tabela separada de itens de pedido ou clientes.
- O preço base é `numeric(12,2)` em `products`; regras e snapshots usam centavos inteiros.
- Os buckets relacionados são `product-images` e `campaign-images`.
- As flags existentes são `marketing_settings.enabled` e `marketing_settings.pricing_enabled`; o fuso configurado é `America/Maceio`.
- A produção possuía um rascunho e três campanhas arquivadas; não havia campanha publicada ativa durante a auditoria.

## Fluxos mapeados

| Fluxo | Implementação principal | Regra confirmada |
|---|---|---|
| Cadastro/edição de produto | `app/admin/product-form.tsx`, `store-context.tsx`, `cloud.ts` | Produto é salvo por RLS administrativa; imagens ficam no bucket de produtos. |
| Preço do catálogo | `store-context.tsx`, `marketing/service.ts` | O catálogo substitui o preço base pela resolução do banco. |
| Campanhas e banners | `app/admin/campaigns.tsx`, `app/admin/campaign/[id].tsx`, migrations 001/002 | Bundle administrativo é salvo por RPC; imagens e placements são filhos da campanha. |
| Carrinho/compra imediata | `store-context.tsx`, telas de produto e carrinho | Preço é exibido no cliente, mas é revalidado antes do pedido. |
| Checkout/pedido | `app/checkout.tsx`, `cloud.ts`, `create_trusted_order` | RPC cria pedido, snapshot e reserva estoque na mesma transação. |
| Baixa/devolução de estoque | `create_trusted_order*`, trigger de status | Reserva na criação; cancelamento devolve quando aplicável. |
| WhatsApp | `src/utils/whatsapp.ts` | Mensagem é montada com o pedido confirmado. |
| Painel | rotas `app/admin/*` | Acesso exige usuário autenticado com `profiles.role = admin`. |

## Banco e dependências

Tabelas envolvidas: `products`, `categories`, `store_settings`, `orders`, `profiles`, `marketing_settings`, `marketing_campaigns`, `marketing_campaign_targets`, `marketing_campaign_assets`, `marketing_campaign_placements`, `marketing_campaign_badges`, `marketing_campaign_price_rules`, `marketing_audit_log` e a nova `product_promotions`.

Funções/triggers/policies relevantes:

- `resolve_product_price_details`, `resolve_catalog_prices`;
- `create_trusted_order`, `admin_save_marketing_campaign`, `admin_marketing_campaign_checklist`;
- triggers de versão/auditoria do marketing e de reserva/devolução de estoque;
- RLS pública somente para catálogo/marketing efetivamente visível e RLS administrativa baseada em `private.is_admin()`;
- policies de upload por pasta do usuário nos buckets de campanha e produto.

## Problemas encontrados

- Não existia promoção individual independente de campanha.
- Datas de campanha eram expostas como `datetime-local`/ISO.
- A conversão monetária aceitava formatos ambíguos de modo inconsistente.
- A seleção de produtos usava lista sem busca/filtro e tinha altura dinâmica limitada.
- Não existia exclusão definitiva segura de rascunho.
- Checkout e configurações repetiam máscaras de telefone.
- Textos, e-mail, telefone, datas, horas, percentuais e quantidades não compartilhavam uma única camada de normalização.
- A primeira versão da exclusão testada revelou conflito entre cascade e auditoria dos filhos; a migration final remove os filhos em ordem explícita antes da campanha.
- A CLI local do Supabase não executou neste ambiente por falha do runtime Bun; foi usada a alternativa gratuita de transação real com `BEGIN`/`ROLLBACK` pelo conector oficial.

## Campos já corretos

- `products.price`, `orders.subtotal`, `delivery_fee` e `total` já usam `numeric(12,2)`.
- Estoque já é inteiro não negativo no banco.
- Prioridade já é limitada de -1000 a 1000.
- Regras percentuais já usam basis points inteiros.
- Nomes de produto/categoria/campanha já possuíam limites básicos no banco.
- Pedidos já possuíam idempotência e snapshot de preço.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Alterar preço histórico | Nenhum pedido antigo é atualizado; snapshot novo é aditivo. |
| Bloquear pedido antigo ao mudar status | Validação estruturada usa trigger condicional por coluna, não constraint retroativa. |
| Preço enviado pelo navegador | RPC ignora preço do cliente e busca produto, promoção e campanhas no banco. |
| Duas regras simultâneas | Ordenação determinística por nível, prioridade, início e UUID; descontos não acumulam. |
| Falha no estoque/pedido | Uma única função PL/pgSQL reverte toda a transação em falha crítica. |
| Apagar imagem compartilhada | Só paths exclusivos registrados nos assets do rascunho são retornados; falhas de storage são auditadas. |
| Fuso/data | Interface usa `DD/MM/AAAA`, converte Maceió (`-03:00`) para UTC e o banco usa `now()`. |
| Dados legados fora do novo padrão | Leitura continua compatível; validações condicionais não reescrevem histórico. |

## Plano implementado

1. Centralizar máscaras, parsing, normalização e mensagens.
2. Reformar editor/lista de campanhas e corrigir layout responsivo.
3. Criar promoção individual e motor de precedência v2.
4. Criar exclusão de rascunho com auditoria e limpeza controlada.
5. Evoluir a RPC de pedido com snapshots completos e validação confiável.
6. Validar a migration em transação com rollback e smoke test de comportamento.
7. Executar TypeScript, lint, testes, exportação web, preview, migration e validação de produção.

