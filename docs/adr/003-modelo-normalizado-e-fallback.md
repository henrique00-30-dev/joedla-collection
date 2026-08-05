# ADR-003 — Modelo normalizado e fallback legado

## Contexto

store_settings.banners guarda banners em JSONB, mas campanhas precisam de
estado, período, posições, alvos, imagens, selo e histórico independentes.

## Decisão

Usar tabelas marketing relacionadas. Manter store_settings e o banner legado
inalterados enquanto o novo módulo estiver desligado.

## Consequências

O modelo permite validação e RLS por responsabilidade. A transição pode ser
gradual e o comportamento antigo continua disponível como rollback visual.
