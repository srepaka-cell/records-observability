export const NOW = Date.parse('2026-10-29T18:00:00Z');

export const PERIODS = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const;

export type PeriodDays = (typeof PERIODS)[number]['days'];

export const CHANNELS = [
  { id: 'manual', label: 'Manual', detail: 'Declared by a person in Box', color: '#0d3f86' },
  { id: 'api', label: 'API', detail: 'Declared by an integration', color: '#1a8cff' },
  { id: 'workflow', label: 'Workflow', detail: 'Declared by a workflow step', color: '#6f42c1' },
  { id: 'lifecycle', label: 'Lifecycle', detail: 'Declared by an object lifecycle transition', color: '#0e8a6a' },
] as const;

export type ChannelId = (typeof CHANNELS)[number]['id'];

export type DeclarationAttempt = {
  id: string;
  atUtc: number;
  channel: ChannelId;
  recordName: string;
  recordType: string;
  recordGroup: string;
  actor: string;
  ok: boolean;
  error?: string;
  retryable?: boolean;
};

const at = (iso: string) => Date.parse(iso);

const ok = (
  id: string,
  iso: string,
  channel: ChannelId,
  recordName: string,
  recordType: string,
  actor: string,
): DeclarationAttempt => ({
  id,
  atUtc: at(iso),
  channel,
  recordName,
  recordType,
  recordGroup: 'Finance',
  actor,
  ok: true,
});

const fail = (
  id: string,
  iso: string,
  channel: ChannelId,
  recordName: string,
  recordType: string,
  actor: string,
  error: string,
  retryable: boolean,
): DeclarationAttempt => ({
  id,
  atUtc: at(iso),
  channel,
  recordName,
  recordType,
  recordGroup: 'Finance',
  actor,
  ok: false,
  error,
  retryable,
});

export const ATTEMPTS: DeclarationAttempt[] = [
  ok('s1', '2026-10-29T09:05:00Z', 'manual', 'Northwind receipt.pdf', 'Invoice', 'Avery Chen'),
  ok('s2', '2026-10-29T11:40:00Z', 'api', 'INV-88421.pdf', 'Invoice', 'acme-erp'),
  ok('s3', '2026-10-29T14:15:00Z', 'workflow', 'Helios amendment.pdf', 'Contract', 'Declare contract'),
  ok('s4', '2026-10-29T16:02:00Z', 'lifecycle', 'Closed period.xlsx', 'Invoice', 'Move to Recorded'),
  ok('s5', '2026-10-28T20:10:00Z', 'api', 'Cedar invoice.pdf', 'Invoice', 'netsuite'),
  fail(
    'f1',
    '2026-10-29T10:12:00Z',
    'manual',
    'Q4 accrual.pdf',
    'Invoice',
    'Avery Chen',
    'Vendor name is required on the Vendor Invoice template.',
    false,
  ),
  fail(
    'f2',
    '2026-10-28T22:40:00Z',
    'api',
    'Vendor bill 4411.pdf',
    'Invoice',
    'acme-erp',
    'API client acme-erp cannot declare record type Invoice.',
    false,
  ),
  ok('s6', '2026-10-28T08:20:00Z', 'manual', 'October tie-out.pdf', 'Invoice', 'Jordan Lee'),
  ok('s7', '2026-10-27T10:00:00Z', 'api', 'INV-88402.pdf', 'Invoice', 'acme-erp'),
  ok('s8', '2026-10-26T12:30:00Z', 'workflow', 'Brightline exhibit.pdf', 'Contract', 'Declare contract'),
  ok('s9', '2026-10-26T09:10:00Z', 'lifecycle', 'Posted invoice.pdf', 'Invoice', 'Move to Recorded'),
  ok('s10', '2026-10-25T15:45:00Z', 'manual', 'Vendor credit.pdf', 'Invoice', 'Riley Patel'),
  ok('s11', '2026-10-25T11:05:00Z', 'api', 'INV-88390.pdf', 'Invoice', 'netsuite'),
  ok('s12', '2026-10-24T16:18:00Z', 'api', 'INV-88371.pdf', 'Invoice', 'acme-erp'),
  ok('s13', '2026-10-23T13:40:00Z', 'workflow', 'Renewal MSA.pdf', 'Contract', 'Declare contract'),
  ok('s14', '2026-10-23T09:25:00Z', 'manual', 'Freight bill.pdf', 'Invoice', 'Avery Chen'),
  ok('s15', '2026-10-22T20:05:00Z', 'lifecycle', 'Approved PO.pdf', 'Purchase Order', 'Move to Recorded'),
  fail(
    'f3',
    '2026-10-27T15:05:00Z',
    'workflow',
    'Signed MSA.pdf',
    'Contract',
    'Declare contract',
    'Workflow run timed out before the declaration step finished.',
    true,
  ),
  ok('s16', '2026-10-20T14:00:00Z', 'manual', 'Tax packet.pdf', 'Invoice', 'Jordan Lee'),
  ok('s17', '2026-10-18T17:30:00Z', 'api', 'INV-88110.pdf', 'Invoice', 'netsuite'),
  ok('s18', '2026-10-16T10:15:00Z', 'workflow', 'SOW 14.pdf', 'Contract', 'Declare contract'),
  ok('s19', '2026-10-12T08:50:00Z', 'lifecycle', 'Received goods.pdf', 'Purchase Order', 'Move to Recorded'),
  ok('s20', '2026-10-08T19:00:00Z', 'api', 'INV-87900.pdf', 'Invoice', 'acme-erp'),
  ok('s21', '2026-10-05T12:00:00Z', 'manual', 'September close.pdf', 'Invoice', 'Avery Chen'),
  fail(
    'f4',
    '2026-10-21T09:30:00Z',
    'lifecycle',
    'Board pack.pdf',
    'Board Minutes',
    'Move to Recorded',
    'Record type Board Minutes has no retention policy.',
    false,
  ),
  fail(
    'f5',
    '2026-10-15T16:00:00Z',
    'api',
    'Expense 900.pdf',
    'Expense Report',
    'netsuite',
    'This object is already a record.',
    false,
  ),
  fail(
    'f6',
    '2026-10-02T11:20:00Z',
    'workflow',
    'PO 7781.pdf',
    'Purchase Order',
    'Declare purchase order',
    'Record group Finance is not assigned to this workflow.',
    false,
  ),
  ok('s22', '2026-09-28T15:00:00Z', 'manual', 'Q3 binder.pdf', 'Invoice', 'Riley Patel'),
  ok('s23', '2026-09-22T11:10:00Z', 'api', 'INV-86002.pdf', 'Invoice', 'acme-erp'),
  ok('s24', '2026-09-14T09:40:00Z', 'workflow', 'Vendor MSA.pdf', 'Contract', 'Declare contract'),
  ok('s25', '2026-09-08T18:20:00Z', 'lifecycle', 'Archived invoice.pdf', 'Invoice', 'Move to Recorded'),
  ok('s26', '2026-08-20T13:00:00Z', 'manual', 'July close.pdf', 'Invoice', 'Avery Chen'),
  fail(
    'f7',
    '2026-09-18T13:00:00Z',
    'lifecycle',
    'Final spec.pdf',
    'Contract',
    'State Final',
    'The declaration service was unavailable.',
    true,
  ),
];

export function channelById(id: ChannelId) {
  const channel = CHANNELS.find((item) => item.id === id);
  if (!channel) throw new Error('Unknown channel');
  return channel;
}

export function periodStart(days: PeriodDays, now = NOW): number {
  return now - days * 86_400_000;
}

export function inPeriod(atUtc: number, days: PeriodDays, now = NOW): boolean {
  return atUtc > periodStart(days, now) && atUtc <= now;
}
