import {
  canTransitionCampaign,
  getCampaignSituation,
  validateCampaignFoundation,
  validateCampaignTransition,
} from '../src/features/marketing/foundation';
import { MarketingCampaign } from '../src/features/marketing/types';
import {
  activePlacements,
  campaignTargetRank,
  marketingDestination,
  resolveProductMarketingBadge,
} from '../src/features/marketing/storefront';
import { MarketingCampaignBundle } from '../src/features/marketing/types';

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

function bundle(changes: Partial<MarketingCampaignBundle> = {}): MarketingCampaignBundle {
  const base = campaign();
  return {
    ...base,
    targets: [{
      id: '21111111-1111-4111-8111-111111111111',
      campaignId: base.id,
      targetType: 'store',
      productId: null,
      categorySlug: null,
      includeNewProducts: true,
      version: 1,
    }],
    assets: [],
    placements: [],
    badge: null,
    priceRules: [],
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

test('alvo direto de produto possui maior precedência', () => {
  const direct = bundle({
    targets: [{
      id: '31111111-1111-4111-8111-111111111111',
      campaignId: campaign().id,
      targetType: 'product',
      productId: 'produto-1',
      categorySlug: null,
      includeNewProducts: false,
      version: 1,
    }],
  });
  expectEqual(campaignTargetRank(direct, { id: 'produto-1', category: 'fitness' }), 3);
});

test('apenas um selo vencedor é exibido', () => {
  const lower = bundle({
    id: '41111111-1111-4111-8111-111111111111',
    priority: 1,
    badge: { id: '51111111-1111-4111-8111-111111111111', campaignId: '41111111-1111-4111-8111-111111111111', label: 'Menor', tone: 'dark', version: 1 },
  });
  const higher = bundle({
    id: '61111111-1111-4111-8111-111111111111',
    priority: 20,
    badge: { id: '71111111-1111-4111-8111-111111111111', campaignId: '61111111-1111-4111-8111-111111111111', label: 'Maior', tone: 'wine', version: 1 },
  });
  expectEqual(resolveProductMarketingBadge([lower, higher], { id: 'produto-1', category: 'fitness' })?.label, 'Maior');
});

test('posição visual mantém somente o vencedor', () => {
  const placement = {
    id: '81111111-1111-4111-8111-111111111111', campaignId: campaign().id,
    position: 'home_hero' as const, title: '', subtitle: '', buttonLabel: '',
    desktopAssetId: null, mobileAssetId: null, destinationType: 'none' as const,
    destinationProductId: null, destinationCategorySlug: null, destinationSearch: null,
    destinationUrl: null, sortOrder: 0, version: 1,
  };
  const lower = bundle({ id: '91111111-1111-4111-8111-111111111111', priority: 1, placements: [{ ...placement, campaignId: '91111111-1111-4111-8111-111111111111' }] });
  const higher = bundle({ id: 'a1111111-1111-4111-8111-111111111111', priority: 2, placements: [{ ...placement, id: 'b1111111-1111-4111-8111-111111111111', campaignId: 'a1111111-1111-4111-8111-111111111111' }] });
  expectEqual(activePlacements([lower, higher])[0].campaign.id, higher.id);
  expectEqual(activePlacements([lower, higher]).length, 1);
});

test('link externo inseguro é bloqueado', () => {
  const placement = {
    id: 'c1111111-1111-4111-8111-111111111111', campaignId: campaign().id,
    position: 'home_hero' as const, title: '', subtitle: '', buttonLabel: '',
    desktopAssetId: null, mobileAssetId: null, destinationType: 'external' as const,
    destinationProductId: null, destinationCategorySlug: null, destinationSearch: null,
    destinationUrl: 'javascript:alert(1)', sortOrder: 0, version: 1,
  };
  expectEqual(marketingDestination(placement, ''), null);
});

console.log(`${executed} testes da fundação de marketing aprovados.`);
