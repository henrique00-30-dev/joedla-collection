# Tarefa 1 — notas de execução aprovadas

Este arquivo registra decisões fornecidas durante a execução que pertencem a blocos posteriores. Elas não são antecipadas no Bloco 1.

## Bloco 4 — profundidade dos cards no desktop

Ao posicionar o cursor sobre um produto em dispositivo com ponteiro e suporte real a `hover`, o card deve combinar:

- elevação sutil com `translateY`;
- escala discreta, limitada a aproximadamente `1.02`–`1.03`;
- sombra progressiva;
- transição suave entre `150 ms` e `250 ms`.

Restrições:

- o efeito não pode alterar o fluxo nem as dimensões da grade;
- os demais cards não podem ser deslocados;
- celular e dispositivos sem `hover` não podem depender desse comportamento;
- `prefers-reduced-motion` deve reduzir ou remover a animação;
- foco por teclado precisa continuar visível e utilizável.
