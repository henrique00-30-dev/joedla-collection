# Tarefa 1 — Fundação do Marketing Inteligente

## Escopo deste documento

Esta fundação pertence à Versão 1A e contém somente campanhas visuais. Ela não
altera preços, carrinho, checkout, pedidos ou estoque.

O módulo é criado com marketing_settings.enabled = false. Enquanto continuar
desativado, as policies públicas não retornam campanhas e a loja mantém o
comportamento anterior.

## Modelo

| Estrutura | Responsabilidade |
|---|---|
| marketing_settings | Chave de ativação, fuso e limite de imagem |
| marketing_campaigns | Estado administrativo, período, prioridade e versão |
| marketing_campaign_targets | Loja inteira, categorias ou produtos |
| marketing_campaign_assets | Metadados das imagens desktop e mobile |
| marketing_campaign_placements | Banner principal e até três posições secundárias |
| marketing_campaign_badges | Único selo visual prioritário da campanha |
| marketing_audit_log | Histórico imutável de campanha e configuração |

As fotos promocionais ficam no bucket campaign-images, separadas das fotos de
produtos. O bucket aceita JPEG, PNG e WebP, com limite inicial de 5 MB.

## Estados e situações

Estados armazenados:

- draft
- published
- paused
- archived

Situações calculadas:

- draft
- scheduled
- active
- ended
- paused
- archived

O início é inclusivo e o término é exclusivo. Timestamps são persistidos em UTC;
a interface futura deverá receber e mostrar datas em America/Maceio.

## Concorrência

marketing_campaigns.version é incrementada pelo banco em toda atualização.
O serviço exige a versão conhecida na cláusula de atualização. Se outra sessão
salvar primeiro, a segunda gravação não sobrescreve silenciosamente os dados.

## Segurança

- Administração depende de private.is_admin().
- Visitantes leem somente campanhas publicadas, dentro do período e quando o
  módulo está habilitado.
- Administradores podem editar, pausar e arquivar.
- Campanhas não possuem policy ou permissão de exclusão.
- Rascunhos são o único estado permitido na criação direta.
- O histórico é escrito por trigger privada e não aceita edição pelo cliente.
- O bucket permite escrita somente ao administrador autenticado, dentro de sua
  pasta e nas extensões aprovadas.

## Compatibilidade

A migration apenas adiciona estruturas. Ela não altera as tabelas existentes e
não remove o banner salvo em store_settings. A migração do banner legado e a
exibição das campanhas pertencem aos blocos posteriores.
