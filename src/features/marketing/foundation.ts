import {
  CampaignSituation,
  CampaignStatus,
  CampaignValidationIssue,
  MarketingCampaign,
  MarketingCampaignCreate,
  MarketingCampaignUpdate,
} from './types';

const transitions: Record<CampaignStatus, readonly CampaignStatus[]> = {
  draft: ['draft', 'published', 'archived'],
  published: ['published', 'paused', 'archived'],
  paused: ['paused', 'published', 'archived'],
  archived: ['archived'],
};

const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type CampaignPeriodSource = Pick<
  MarketingCampaign,
  'startAt' | 'endAt' | 'status'
>;

export function isCampaignStatus(value: string): value is CampaignStatus {
  return value === 'draft'
    || value === 'published'
    || value === 'paused'
    || value === 'archived';
}

export function canTransitionCampaign(
  current: CampaignStatus,
  next: CampaignStatus,
) {
  return transitions[current].includes(next);
}

export function getCampaignSituation(
  campaign: CampaignPeriodSource,
  effectiveAt: Date = new Date(),
): CampaignSituation {
  if (campaign.status === 'draft') return 'draft';
  if (campaign.status === 'paused') return 'paused';
  if (campaign.status === 'archived') return 'archived';

  const start = parseTimestamp(campaign.startAt);
  if (start === null) return 'scheduled';

  const now = effectiveAt.getTime();
  if (now < start) return 'scheduled';

  const end = parseTimestamp(campaign.endAt);
  if (end !== null && now >= end) return 'ended';

  return 'active';
}

export function validateCampaignFoundation(
  campaign: MarketingCampaignCreate | MarketingCampaignUpdate,
  status: CampaignStatus = 'draft',
): CampaignValidationIssue[] {
  const issues: CampaignValidationIssue[] = [];

  if ('name' in campaign && campaign.name !== undefined) {
    const nameLength = campaign.name.trim().length;
    if (nameLength < 3 || nameLength > 120) {
      issues.push({
        code: 'invalid_name',
        field: 'name',
        message: 'O nome deve ter entre 3 e 120 caracteres.',
      });
    }
  }

  const start = parseTimestampWithIssue(campaign.startAt, 'startAt', issues);
  const end = parseTimestampWithIssue(campaign.endAt, 'endAt', issues);

  if (status === 'published' && start === null) {
    issues.push({
      code: 'missing_start',
      field: 'startAt',
      message: 'Uma campanha publicada precisa de data de início.',
    });
  }

  if (start !== null && end !== null && start >= end) {
    issues.push({
      code: 'end_before_start',
      field: 'endAt',
      message: 'O término deve ser posterior ao início.',
    });
  }

  if (
    campaign.priority !== undefined
    && (!Number.isInteger(campaign.priority)
      || campaign.priority < -1000
      || campaign.priority > 1000)
  ) {
    issues.push({
      code: 'invalid_priority',
      field: 'priority',
      message: 'A prioridade deve ser um inteiro entre -1000 e 1000.',
    });
  }

  return deduplicateIssues(issues);
}

export function validateCampaignTransition(
  campaign: MarketingCampaign,
  nextStatus: CampaignStatus,
) {
  const issues = validateCampaignFoundation(campaign, nextStatus);

  if (!canTransitionCampaign(campaign.status, nextStatus)) {
    issues.push({
      code: 'invalid_transition',
      field: 'status',
      message: `Não é possível mudar de ${campaign.status} para ${nextStatus}.`,
    });
  }

  return issues;
}

export function assertValidCampaign(
  issues: CampaignValidationIssue[],
) {
  if (!issues.length) return;
  throw new MarketingCampaignValidationError(issues);
}

export class MarketingCampaignValidationError extends Error {
  constructor(readonly issues: CampaignValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'MarketingCampaignValidationError';
  }
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  if (!utcTimestampPattern.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseTimestampWithIssue(
  value: string | null | undefined,
  field: 'startAt' | 'endAt',
  issues: CampaignValidationIssue[],
) {
  if (!value) return null;
  if (!utcTimestampPattern.test(value)) {
    issues.push({
      code: field === 'startAt' ? 'invalid_start' : 'invalid_end',
      field,
      message: field === 'startAt'
        ? 'A data de início deve conter data, hora e fuso.'
        : 'A data de término deve conter data, hora e fuso.',
    });
    return null;
  }
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    issues.push({
      code: field === 'startAt' ? 'invalid_start' : 'invalid_end',
      field,
      message: field === 'startAt'
        ? 'A data de início é inválida.'
        : 'A data de término é inválida.',
    });
    return null;
  }

  return parsed;
}

function deduplicateIssues(issues: CampaignValidationIssue[]) {
  return issues.filter(
    (issue, index) => issues.findIndex(
      (candidate) => candidate.code === issue.code && candidate.field === issue.field,
    ) === index,
  );
}
