import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { HealthStatus, ServiceHealth } from '../lib/maintenance';
import { describeHealth, describeRule } from '../lib/maintenance';
import { formatDate } from '../lib/format';
import { Button } from './ui';

export const STATUS_STYLES: Record<HealthStatus, { label: string; bar: string; pill: string; text: string }> = {
  overdue: { label: 'Overdue', bar: 'bg-bad', pill: 'bg-bad-soft text-bad', text: 'text-bad' },
  'due-soon': { label: 'Due soon', bar: 'bg-warn', pill: 'bg-warn-soft text-warn', text: 'text-warn' },
  good: { label: 'OK', bar: 'bg-ok', pill: 'bg-ok-soft text-ok', text: 'text-ink-2' },
};

export function StatusIcon({ status, className = 'w-4 h-4' }: { status: HealthStatus; className?: string }) {
  if (status === 'overdue') return <AlertTriangle className={`${className} text-bad`} aria-hidden />;
  if (status === 'due-soon') return <Clock className={`${className} text-warn`} aria-hidden />;
  return <CheckCircle className={`${className} text-ok`} aria-hidden />;
}

export function StatusBadge({ status, children }: { status: HealthStatus; children?: ReactNode }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-semibold whitespace-nowrap ${s.pill}`}>
      <StatusIcon status={status} className="w-3.5 h-3.5" />
      {children ?? s.label}
    </span>
  );
}

/** Thin interval meter; the tick marks the "due soon" threshold. */
function Meter({ health }: { health: ServiceHealth }) {
  const pct = Math.min(100, Math.round(health.usage * 100));
  return (
    <div
      className="relative h-1.5 rounded-full bg-surface-2 border border-line overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${health.rule.serviceType}: ${pct}% of interval used`}
    >
      <div className={`h-full ${STATUS_STYLES[health.status].bar}`} style={{ width: `${pct}%` }} />
      <div className="absolute inset-y-0 left-[85%] w-px bg-line-strong" aria-hidden />
    </div>
  );
}

/** The service schedule as a dense table: one row per rule, like the schedule page of an owner's manual. */
export function ServiceSchedule({ health, onLog }: { health: ServiceHealth[]; onLog: (h: ServiceHealth) => void }) {
  return (
    <div className="bg-surface border border-line rounded-md divide-y divide-line">
      <div className="hidden md:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_5.5rem] gap-4 px-4 py-2 label-caps">
        <span>Service</span>
        <span>Interval used</span>
        <span>Next due</span>
        <span>Last done</span>
        <span className="sr-only">Actions</span>
      </div>
      {health.map((h) => (
        <div
          key={h.rule.serviceType}
          className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_5.5rem] gap-x-4 gap-y-2 px-4 py-3 items-center"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusIcon status={h.status} className="w-4 h-4 shrink-0" />
              <span className="font-medium text-ink">{h.rule.serviceType}</span>
            </div>
            <p className="text-xs text-ink-3 mt-0.5 pl-6">{describeRule(h.rule)}</p>
          </div>
          <div className="md:hidden justify-self-end">
            {h.status !== 'good' && (
              <Button size="sm" variant="secondary" onClick={() => onLog(h)}>
                Log
              </Button>
            )}
          </div>
          <div className="col-span-2 md:col-span-1">
            <Meter health={h} />
          </div>
          <p className={`col-span-2 md:col-span-1 text-sm font-medium tnum ${STATUS_STYLES[h.status].text}`}>{describeHealth(h)}</p>
          <p className="col-span-2 md:col-span-1 -mt-1.5 md:mt-0 text-xs text-ink-3 tnum">
            {h.lastService ? (
              <>
                {formatDate(h.lastService.date)} · {h.lastService.mileage.toLocaleString('en-US')} mi
              </>
            ) : (
              'No record (assumed original)'
            )}
          </p>
          <div className="hidden md:block text-right">
            {h.status !== 'good' && (
              <Button size="sm" variant="secondary" onClick={() => onLog(h)}>
                Log it
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
