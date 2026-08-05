# Inventário de campos estruturados

Campos inexistentes no produto atual (CPF, CNPJ e CEP) não foram adicionados artificialmente. As funções reutilizáveis de máscara, normalização e dígito verificador ficaram prontas para qualquer tela futura que realmente os colete.

| Tela | Campo | Formato anterior | Formato esperado | Obrig. | Mín. | Máx. | Validação | Formato salvo | Alteração |
|---|---|---|---|---:|---:|---:|---|---|---|
| Produto | Nome | texto livre | texto simples | sim | 3 | 120 | sem markup; trim | texto normalizado | frontend + trigger |
| Produto | Descrição | texto livre | texto simples multilinha | não | 0 | 2000 | sem markup/controles | texto normalizado | frontend + trigger |
| Produto | Preço normal | decimal solto | `R$ 1.250,90` | sim | R$ 0,01 | numeric(12,2) | parsing BR/US; centavos | numeric(12,2) | máscara + banco |
| Produto | Preço promocional | inexistente | `R$ 199,00` | cond. | R$ 0,01 | menor que normal | ativo, período e precedência | bigint em centavos | novo componente/RPC |
| Produto | Datas da promoção | inexistente | `DD/MM/AAAA` | não | 10 chars | 10 chars | data real/bissexto/fim > início | timestamptz UTC | máscara + RPC |
| Produto | Selo individual | inexistente | texto curto | não | 1 | 24 | sem markup; tom predefinido | texto normalizado | novo campo/RPC |
| Produto | Estoque | número livre | inteiro não negativo | cond. | 0 | 999999 | inteiro; sem decimal/letra | integer | máscara + trigger |
| Produto | Tamanhos/cores | CSV livre | texto simples | não | 0 | 300 por grupo | sem markup; trim | text[] | limite + trigger |
| Campanha | Nome | texto livre | texto simples | sim | 3 | 120 | sem markup; trim | texto normalizado | limite + trigger |
| Campanha | Início/fim | ISO com hora | `DD/MM/AAAA` | início ao publicar | 10 | 10 | calendário real; ordem | timestamptz UTC | interface BR |
| Campanha | Horas | embutidas na data | `HH:MM` avançado | não | 5 | 5 | 00:00–23:59 | combinado em UTC | separado/mascarado |
| Campanha | Percentual | número solto | `10%` | cond. | >0 | <100 | basis points; não gera zero | integer basis points | máscara + banco |
| Campanha | Preço manual | decimal solto | `R$ 1.250,90` | cond. | R$ 0,01 | menor que normal | centavos; produto-alvo | bigint em centavos | máscara + banco |
| Campanha | Prioridade | sempre visível | inteiro avançado | não | -1000 | 1000 | inteiro; padrão 0 | integer | movido/limitado |
| Campanha | Selo | texto curto | texto curto | não | 1 | 24 | sem markup; tom predefinido | texto | limite + banco |
| Campanha | Busca de produto | inexistente | texto de busca | não | 0 | 120 | filtro local normalizado | não persiste | novo |
| Checkout | Nome | texto livre | texto simples | sim | 3 | 120 | trim; sem markup | texto normalizado | frontend + RPC/trigger |
| Checkout | WhatsApp | máscara local | `(00) 00000-0000` | sim | 11 dígitos | 11 dígitos | DDD, celular, dígitos | 11 dígitos | componente + RPC |
| Checkout | Cidade | texto livre | texto simples | sim | 2 | 80 | trim; sem markup | texto normalizado | frontend + RPC |
| Checkout | Bairro | texto livre | texto simples | entrega | 2 | 100 | trim; sem markup | texto normalizado | frontend + RPC |
| Checkout | Rua/número | texto livre | texto simples, aceita `S/N` | entrega | 3 | 180 | trim; sem markup | texto normalizado | frontend + RPC |
| Checkout | Referência | texto livre | texto simples | não | 0 | 160 | trim; sem markup | texto normalizado | frontend + RPC |
| Checkout | Observação | texto livre | multilinha simples | não | 0 | 500 | sem markup/controles | texto normalizado | frontend + RPC |
| Carrinho | Quantidade | stepper | inteiro 1–99 | sim | 1 | 99/estoque | inteiro e estoque no banco | integer no snapshot | limite cliente + RPC |
| Configurações | WhatsApp | texto livre | `(00) 00000-0000` | não | 11 dígitos | 11 dígitos | celular/DDD | 11 dígitos | componente + trigger |
| Configurações | Nome/cidade | texto livre | texto simples | sim | 2 | 120/80 | trim; sem markup | texto normalizado | limites + trigger |
| Configurações | Mensagem/endereço | texto livre | texto simples | não | 0 | 240 | trim; sem markup | texto normalizado | limites + trigger |
| Categorias | Nome | texto livre | texto simples | sim | 2 | 80 | trim; sem markup | texto normalizado | frontend + trigger |
| Avisos | Mensagens | texto livre | até 20 textos | não | 1 | 220 cada | sem markup; trim | text[] | limites + normalização |
| Aparência | Datas de banner | `AAAA-MM-DD` | `DD/MM/AAAA` | não | 10 | 10 | data real e conversão | date ISO | máscara/conversão |
| Aparência | Textos de banner | texto livre | texto simples | cond. | 1 | 40–240 | sem markup; trim | JSON/texto normalizado | limites + validação |
| Conta/login | E-mail | checagem por `@` | e-mail normalizado | sim | estrutura | 254 | trim/lowercase/estrutura | e-mail normalizado | validação compartilhada |
| Conta | Código OTP | texto/número | 6 dígitos | sim | 6 | 6 | somente dígitos | 6 dígitos | máscara/limite |
| Utilitário futuro | CPF | inexistente | `000.000.000-00` | conforme tela | 11 dígitos | 11 dígitos | verificadores/repetidos | somente dígitos | componente reutilizável |
| Utilitário futuro | CNPJ | inexistente | `00.000.000/0000-00` | conforme tela | 14 dígitos | 14 dígitos | verificadores/repetidos | somente dígitos | componente reutilizável |
| Utilitário futuro | CEP | inexistente | `00000-000` | conforme tela | 8 dígitos | 8 dígitos | quantidade exata | somente dígitos | componente reutilizável |

