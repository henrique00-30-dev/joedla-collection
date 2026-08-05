# ADR-002 — Arquitetura multiempresa adiada

## Contexto

O projeto atual atende somente a Joedla Collection. Um isolamento multiempresa
incompleto aumentaria o risco de vazamento entre lojas.

## Decisão

Não adicionar tenant_id, store_id ou novos papéis genéricos na Tarefa 1.
Nomes internos evitam acoplamento visual desnecessário, mas o banco permanece
de uma única loja.

## Consequências

Uma futura versão multiempresa precisará revisar autenticação, RLS, storage,
produtos, clientes e pedidos como projeto independente.
