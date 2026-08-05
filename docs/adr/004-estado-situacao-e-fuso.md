# ADR-004 — Estado administrativo, situação e fuso

## Contexto

Uma campanha publicada pode estar agendada, ativa ou encerrada conforme o
período. Misturar estado salvo com situação temporal dificulta pausa e auditoria.

## Decisão

Salvar apenas draft, published, paused e archived. Calcular scheduled, active e
ended. O início é inclusivo e o término exclusivo. Persistir timestamptz em UTC
e usar America/Maceio na interface.

## Consequências

O relógio do banco determina o acesso público. A interface futura deverá
converter entradas locais para UTC e nunca depender do relógio do cliente como
fonte definitiva.
