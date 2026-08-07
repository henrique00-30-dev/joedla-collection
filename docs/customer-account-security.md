# Conta do cliente — segurança e integração

## Escopo

Esta etapa mantém a Joedla Collection como uma única loja. Não há multiempresa, tenant_id ou troca de estabelecimento.

## Autenticação

- Cliente: Supabase Auth com e-mail + senha e storageKey dedicado `joedla-customer-auth`.
- Administrador: sessão administrativa separada.
- O cliente não depende de magic link para entrar.
- O cadastro público passa pela Edge Function `register-customer`, com validação e rate limit server-side.
- A service role existe somente na Edge Function, nunca no cliente público.

## Dados privados

Tabelas de cliente usam RLS com `auth.uid()` e o administrador é validado por `private.is_admin()`.

Dados privados incluem endereços, favoritos, histórico recente, notificações, consentimento, fidelidade, cupons e solicitações de privacidade.

## Avaliações e perguntas

- Não existe publicação anônima.
- Avaliação e pergunta são vinculadas ao usuário autenticado no banco.
- Avaliação nova sempre entra como `pending`.
- Somente avaliações `approved` ficam públicas.
- Pergunta nova sempre entra como `pending` e só `published` fica pública.
- Compra verificada é calculada no banco a partir do pedido real do cliente; não é um campo confiado do navegador.

## Pedidos

Pedidos existentes no dispositivo podem ser vinculados à conta somente com a combinação `order_id + lookup_token`, e apenas se ainda não pertencerem a outra conta. Não existe associação automática por nome ou telefone.

## LGPD

O consentimento de marketing é independente do cadastro e tem histórico próprio. O cliente pode registrar solicitação de acesso aos dados ou exclusão de conta. A exclusão não é automática, para evitar perda acidental e permitir tratamento correto de registros que precisam ser preservados por obrigação comercial/fiscal.

## Pendência operacional de segurança

O Supabase Security Advisor informa que a proteção contra senhas vazadas está desativada no Auth. Essa configuração deve ser habilitada no painel do Supabase para complementar as regras de senha aplicadas no aplicativo.
