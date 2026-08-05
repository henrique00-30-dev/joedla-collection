# ADR-001 — Campanha visual separada de promoção de preço

## Contexto

O pedido atual ainda recebe preços e totais calculados no navegador. Acrescentar
descontos nesse fluxo criaria risco de manipulação e divergência.

## Decisão

A Versão 1A contém somente destaque visual. Nenhuma tabela ou serviço desta
fundação altera preço, pedido ou estoque. Promoções monetárias permanecem na
Versão 1B e exigirão cálculo em operação confiável.

## Consequências

A entrega visual pode ser homologada de forma independente. Selos da Versão 1A
não significam desconto e não podem anunciar disponibilidade inexistente.
