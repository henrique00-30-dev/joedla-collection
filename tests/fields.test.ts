import {
  formatBrlInput,
  brazilDateToIsoDate,
  isValidBrazilDate,
  isValidBrazilPhone,
  isValidCnpj,
  isValidCpf,
  isValidQuantity,
  isValidTime,
  isoDateToBrazilDate,
  maceioDateTimeToIso,
  maskBrazilPhone,
  maskCep,
  maskCpf,
  parseBrlCents,
  parsePercentageBasisPoints,
} from '../src/utils/fields';

let executed = 0;

function test(name: string, run: () => void) {
  try {
    run();
    executed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    throw new Error(`Falha em "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

function equal<T>(actual: T, expected: T) {
  if (actual !== expected) throw new Error(`esperado ${String(expected)}, recebido ${String(actual)}`);
}

test('moeda aceita inteiro', () => equal(parseBrlCents('120'), 12000));
test('moeda aceita vírgula decimal', () => equal(parseBrlCents('120,50'), 12050));
test('moeda aceita ponto decimal', () => equal(parseBrlCents('120.50'), 12050));
test('moeda aceita milhar brasileiro', () => equal(parseBrlCents('1.250,90'), 125090));
test('moeda formata reais', () => equal(formatBrlInput(125090), 'R$ 1.250,90'));
test('moeda rejeita letras', () => equal(parseBrlCents('12x'), null));
test('telefone celular possui máscara', () => equal(maskBrazilPhone('79999999999'), '(79) 99999-9999'));
test('telefone fixo é válido', () => equal(isValidBrazilPhone('(79) 3333-4444'), true));
test('telefone sem DDD é inválido', () => equal(isValidBrazilPhone('99999-9999'), false));
test('CPF válido passa dígitos verificadores', () => equal(isValidCpf('529.982.247-25'), true));
test('CPF repetido é inválido', () => equal(isValidCpf('111.111.111-11'), false));
test('máscara de CPF limita 11 dígitos', () => equal(maskCpf('52998224725123'), '529.982.247-25'));
test('CNPJ válido passa dígitos verificadores', () => equal(isValidCnpj('04.252.011/0001-10'), true));
test('CEP possui oito números', () => equal(maskCep('49000000'), '49000-000'));
test('data bissexta válida', () => equal(isValidBrazilDate('29/02/2028'), true));
test('data impossível é inválida', () => equal(isValidBrazilDate('31/02/2026'), false));
test('data brasileira converte para armazenamento', () => equal(brazilDateToIsoDate('10/08/2026'), '2026-08-10'));
test('data armazenada exibe padrão brasileiro', () => equal(isoDateToBrazilDate('2026-08-10'), '10/08/2026'));
test('hora máxima válida', () => equal(isValidTime('23:59'), true));
test('hora 24 é inválida', () => equal(isValidTime('24:00'), false));
test('quantidade inteira respeita limite', () => equal(isValidQuantity('99', 1, 99), true));
test('quantidade decimal é inválida', () => equal(isValidQuantity('1,5', 1, 99), false));
test('percentual vira pontos-base', () => equal(parsePercentageBasisPoints('10,25%'), 1025));
test('início em Maceió converte para UTC', () => equal(maceioDateTimeToIso('10/08/2026', '00:00', 'start'), '2026-08-10T03:00:00.000Z'));
test('fim em Maceió usa o fim do minuto', () => equal(maceioDateTimeToIso('10/08/2026', '23:59', 'end'), '2026-08-11T02:59:59.999Z'));

console.log(`${executed} testes de campos brasileiros aprovados.`);
