# ADR-005 — Segurança e concorrência administrativa

## Contexto

A proteção não pode depender apenas da rota administrativa. Duas sessões
também não podem sobrescrever silenciosamente a mesma campanha.

## Decisão

Reutilizar private.is_admin() nas policies. Criar campanhas somente como
rascunho, não permitir exclusão e registrar mudanças por trigger. Usar a coluna
version, incrementada no banco, como controle de concorrência otimista.

## Consequências

O frontend precisará enviar a versão conhecida ao salvar e recarregar os dados
quando ocorrer conflito. Alterações críticas ficam disponíveis para auditoria.
