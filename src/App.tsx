import { useState } from 'react';
import {
  ATTEMPTS,
  CHANNELS,
  NOW,
  PERIODS,
  channelById,
  inPeriod,
  periodStart,
  type ChannelId,
  type DeclarationAttempt,
  type PeriodDays,
} from './data';
import { formatDay, formatWhen } from './format';

const PERIOD_DAYS = new Set<number>(PERIODS.map((period) => period.days));

const RECORDS_HOME = import.meta.env.DEV
  ? 'http://127.0.0.1:4173/'
  : 'https://srepaka-cell.github.io/records-manager-app/';

function initialPeriod(): PeriodDays {
  const raw = new URLSearchParams(window.location.search).get('period');
  const parsed = raw === null ? Number.NaN : Number(raw);
  return PERIOD_DAYS.has(parsed) ? (parsed as PeriodDays) : 7;
}

function isoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return value;
}

function recordsHref(days: PeriodDays): string {
  const fromDay = isoDate(dayKey(periodStart(days) + 1));
  const toDay = isoDate(dayKey(NOW));
  const url = new URL(RECORDS_HOME);
  if (fromDay) url.searchParams.set('declaredFrom', fromDay);
  if (toDay) url.searchParams.set('declaredTo', toDay);
  url.searchParams.set('from', 'observability');
  url.searchParams.set('period', String(days));
  url.hash = 'records';
  return url.toString();
}

export default function App() {
  const [days, setDays] = useState<PeriodDays>(initialPeriod);
  const [attempts, setAttempts] = useState(ATTEMPTS);
  const [notice, setNotice] = useState('');

  const visible = attempts.filter((attempt) => inPeriod(attempt.atUtc, days));
  const declared = visible.filter((attempt) => attempt.ok);
  const failures = visible.filter((attempt) => !attempt.ok).sort((a, b) => b.atUtc - a.atUtc);
  const buckets = trendBuckets(declared, days);

  const choosePeriod = (next: number) => {
    if (!PERIOD_DAYS.has(next)) return;
    setDays(next as PeriodDays);
    setNotice('');
  };

  const retry = (attempt: DeclarationAttempt) => {
    if (!attempt.retryable || attempt.ok) return;
    setAttempts((current) => current.map((item) => (item.id === attempt.id ? { ...item, ok: true, error: undefined, retryable: false } : item)));
    setNotice(`Declared ${attempt.recordName}.`);
  };

  return (
    <div className="app">
      <aside className="nav">
        <p className="brand">Governance</p>
        <p className="nav-current">Records Observability Dashboard</p>
      </aside>
      <div className="main">
        <header className="page-header">
          <div>
            <h1>Records Observability Dashboard</h1>
            <p className="meta">How records were declared, and which attempts still need an admin.</p>
          </div>
        </header>

        <div className="periods" role="group" aria-label="Time period">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              className={days === period.days ? 'primary' : ''}
              aria-pressed={days === period.days}
              data-target-id={`Observability-period-${period.days}`}
              onClick={() => choosePeriod(period.days)}
            >
              {period.label}
            </button>
          ))}
          <p className="meta period-range">
            {formatDay(periodStart(days))} – {formatDay(NOW)}
          </p>
        </div>

        <section className="summary" aria-label="Declaration summary">
          <a className="panel summary-declared" href={recordsHref(days)} data-target-id="Observability-openDeclared">
            <h2>Declared</h2>
            <p className="summary-value">{declared.length}</p>
            <p className="meta">Records created in this period. Opens the records dashboard.</p>
          </a>
          <article className="panel summary-failed">
            <h2>Failures</h2>
            <p className="summary-value">{failures.length}</p>
            <p className="meta">Attempts that did not create a record.</p>
          </article>
        </section>

        <section aria-labelledby="trend-heading">
          <h2 id="trend-heading" className="dash-heading">
            Declarations
          </h2>
          <div className="panel trend">
            <LineChart buckets={buckets} />
          </div>
        </section>

        <section aria-labelledby="failure-heading">
          <h2 id="failure-heading" className="dash-heading">
            Needs action
          </h2>
          {notice ? <p className="notice">{notice}</p> : null}
          {failures.length === 0 ? <p className="meta">No declaration failures in this period.</p> : null}
          {failures.length > 0 ? (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Declaration failures</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Object</th>
                    <th scope="col">Record type</th>
                    <th scope="col">Path</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Failure</th>
                    <th scope="col">
                      <span className="sr-only">Retry</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {failures.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{formatWhen(attempt.atUtc)}</td>
                      <td>{attempt.recordName}</td>
                      <td>{attempt.recordType}</td>
                      <td>{channelById(attempt.channel).label}</td>
                      <td>{attempt.actor}</td>
                      <td>{attempt.error}</td>
                      <td>
                        {attempt.channel === 'workflow' && attempt.retryable ? (
                          <button type="button" data-target-id={`Observability-retry-${attempt.id}`} onClick={() => retry(attempt)}>
                            Retry
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const TOTAL_COLOR = '#1b1f24';

function LineChart({ buckets }: { buckets: Bucket[] }) {
  const width = 640;
  const height = 240;
  const padLeft = 28;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const series = [
    ...CHANNELS.map((channel) => ({
      id: channel.id,
      label: channel.label,
      color: channel.color,
      width: 2,
      values: buckets.map((bucket) => bucket.counts[channel.id]),
    })),
    {
      id: 'total',
      label: 'Total',
      color: TOTAL_COLOR,
      width: 2.75,
      values: buckets.map((bucket) => CHANNELS.reduce((sum, channel) => sum + bucket.counts[channel.id], 0)),
    },
  ];
  const peak = Math.max(1, ...series.flatMap((item) => item.values));
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const xAt = (index: number) => padLeft + (buckets.length <= 1 ? innerWidth / 2 : (index / (buckets.length - 1)) * innerWidth);
  const yAt = (count: number) => padTop + (1 - count / peak) * innerHeight;
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <div>
      <ul className="trend-legend">
        {series.map((item) => (
          <li key={item.id}>
            <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Declarations by path and total over time">
        <line x1={padLeft} x2={width - padRight} y1={yAt(0)} y2={yAt(0)} className="grid-line" />
        <line x1={padLeft} x2={width - padRight} y1={yAt(peak)} y2={yAt(peak)} className="grid-line" />
        <text x={0} y={yAt(0) + 4} className="axis-label">
          0
        </text>
        <text x={0} y={yAt(peak) + 4} className="axis-label">
          {peak}
        </text>
        {series.map((item) => (
          <polyline
            key={item.id}
            points={item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')}
            fill="none"
            stroke={item.color}
            strokeWidth={item.width}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {series.map((item) =>
          buckets.map((bucket, index) =>
            item.values[index] > 0 ? (
              <circle key={`${item.id}-${bucket.start}`} cx={xAt(index)} cy={yAt(item.values[index])} r={item.id === 'total' ? 3.5 : 2.5} fill={item.color}>
                <title>{`${bucket.label}, ${item.label}: ${item.values[index]}`}</title>
              </circle>
            ) : null,
          ),
        )}
        {buckets.map((bucket, index) =>
          index % labelStep === 0 || index === buckets.length - 1 ? (
            <text
              key={bucket.start}
              x={xAt(index)}
              y={height - 6}
              textAnchor={index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle'}
              className="axis-label"
            >
              {bucket.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

type Bucket = { start: number; label: string; counts: Record<ChannelId, number> };

function trendBuckets(declared: DeclarationAttempt[], days: PeriodDays): Bucket[] {
  const start = periodStart(days);
  if (days !== 1) {
    const first = dayKey(start + 1);
    const last = dayKey(NOW);
    const keys = days === 90 ? weekKeys(first, last) : dayKeys(first, last);
    const buckets = keys.map((key) => emptyBucket(Date.parse(`${key}T12:00:00Z`), formatDay(Date.parse(`${key}T12:00:00Z`)), key));
    for (const attempt of declared) {
      const key = days === 90 ? weekStart(dayKey(attempt.atUtc)) : dayKey(attempt.atUtc);
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.counts[attempt.channel] += 1;
    }
    return buckets;
  }
  const size = 4 * 3_600_000;
  const count = 6;
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketStart = start + index * size;
    return { ...emptyBucket(bucketStart, formatHour(bucketStart)), key: String(index) };
  });
  for (const attempt of declared) {
    const index = Math.min(count - 1, Math.max(0, Math.floor((attempt.atUtc - start) / size)));
    buckets[index].counts[attempt.channel] += 1;
  }
  return buckets;
}

function emptyBucket(start: number, label: string, key = ''): Bucket & { key: string } {
  return { start, label, key, counts: { manual: 0, api: 0, workflow: 0, lifecycle: 0 } };
}

function dayKey(utc: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utc));
}

function dayKeys(first: string, last: string): string[] {
  const keys: string[] = [];
  let cursor = first;
  while (cursor <= last && keys.length < 40) {
    keys.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return keys;
}

function weekKeys(first: string, last: string): string[] {
  const keys: string[] = [];
  let cursor = weekStart(first);
  const end = weekStart(last);
  while (cursor <= end && keys.length < 20) {
    keys.push(cursor);
    cursor = shiftDay(cursor, 7);
  }
  return keys;
}

function weekStart(key: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return shiftDay(key, -mondayOffset);
}

function shiftDay(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatHour(utc: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
  }).format(new Date(utc));
}
