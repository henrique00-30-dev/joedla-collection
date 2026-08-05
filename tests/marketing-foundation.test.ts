import {
  canTransitionCampaign,
  getCampaignSituation,
  validateCampaignFoundation,
  validateCampaignTransition,
} from '../src/features/marketing/foundation';
import { MarketingCampaign } from '../src/features/marketing/types';

let executed = 0;

function test(name: string, run: () => void) {
  try {
    run();
    executed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    throw new Error(
      `Falha em "${name}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`esperado ${String(expected)}, recebido ${String(actual)}`);
  }
}

function expectIncludes<T>(values: T[], expected: T) {
  if (!values.includes(expected)) {
    throw new Error(`a lista não contém ${String(expected)}`);
  }
}

function campaign(
  changes: Partial<MarketingCampaign> = {},
): MarketingCampaign {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Nova coleção',
    status: 'published',
    startAt: '2026-08-05T12:00:00.000Z',
    endAt: '2026-08-05T14:00:00.000Z',
    priority: 10,
    version: 1,
    publishedAt: '2026-08-05T12:00:00.000Z',
    pausedAt: null,
    archivedAt: null,
    createdAt: '2026-08-05T11:00:00.000Z',
    updatedAt: '2026-08-05T12:00:00.000Z',
    ...changes,
  };
}

test('início é inclusivo', () => {
  expectEqual(
    getCampaignSituation(campaign(), new Date('2026-08-05T12:00:00.000Z')),
    'active',
  );
});

test('término é exclusivo', () => {
  expectEqual(
    getCampaignSituation(campaign(), new Date('2026-08-05T14:00:00.000Z')),
    'ended',
  );
});

test('campanha futura fica agendada', () => {
  expectEqual(
    getCampaignSituation(campaign(), new Date('2026-08-05T11:59:59.999Z')),
    'scheduled',
  );
});

test('campanha sem término permanece ativa', () => {
  expectEqual(
    getCampaignSituation(
      campaign({ endAt: null }),
      new Date('2030-01-01T00:00:00.000Z'),
    ),
    'active',
  );
});

test('estado administrativo pausado prevalece sobre o período', () => {
  expectEqual(
    getCampaignSituation(
      campaign({ status: 'paused' }),
      new Date('2026-08-05T13:00:00.000Z'),
    ),
    'paused',
  );
});

test('estado administrativo arquivado é terminal', () => {
  expectEqual(canTransitionCampaign('archived', 'published'), false);
  expectEqual(canTransitionCampaign('archived', 'archived'), true);
});

test('rascunho pode ser publicado ou arquivado', () => {
  expectEqual(canTransitionCampaign('draft', 'published'), true);
  expectEqual(canTransitionCampaign('draft', 'archived'), true);
  expectEqual(canTransitionCampaign('draft', 'paused'), false);
});

test('publicação exige início', () => {
  const issues = validateCampaignFoundation(
    {
      name: 'Campanha válida',
      startAt: null,
      endAt: null,
      priority: 0,
    },
    'published',
  );
  expectIncludes(issues.map((issue) => issue.code), 'missing_start');
});

test('término deve ser posterior ao início', () => {
  const issues = validateCampaignFoundation(
    {
      name: 'Campanha válida',
      startAt: '2026-08-05T14:00:00.000Z',
      endAt: '2026-08-05T14:00:00.000Z',
      priority: 0,
    },
    'draft',
  );
  expectIncludes(issues.map((issue) => issue.code), 'end_before_start');
});

test('data sem hora e fuso é rejeitada', () => {
  const issues = validateCampaignFoundation(
    {
      name: 'Campanha válida',
      startAt: '2026-08-05',
      endAt: null,
      priority: 0,
    },
    'draft',
  );
  expectIncludes(issues.map((issue) => issue.code), 'invalid_start');
});

test('transição inválida é identificada', () => {
  const issues = validateCampaignTransition(
    campaign({ status: 'published' }),
    'draft',
  );
  expectIncludes(issues.map((issue) => issue.code), 'invalid_transition');
});

console.log(`${executed} testes da fundação de marketing aprovados.`);
