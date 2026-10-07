import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import type { HealthStatus, ServiceHealth } from '../lib/maintenance';
import { describeHealth, describeRule } from '../lib/maintenance';
import { formatDate } from '../lib/format';
import { Card } from './ui';

export const STATUS_STYLES: Record<HealthStatus, { label: string; bar: string; border: string; badge: string; text: string }> = {
  overdue: { label: 'Overdue', bar: 'bg-red-500', border: '#ef4444', badge: 'bg-red-50 text-red-700 ring-red-200', text: 'text-red-700' },
  'due-soon': { label: 'Due soon', bar: 'bg-amber-500', border: '#f59e0b', badge: 'bg-amber-50 text-amber-800 ring-amber-200', text: 'text-amber-800' },
  good: { label: 'Good', bar: 'bg-emerald-500', border: '#10b981', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', text: 'text-slate-500' },
};

export function StatusIcon({ status, className = 'w-4 h-4' }: { status: HealthStatus; className?: string }) {
  if (status === 'overdue') return <AlertTriangle className={`${className} text-red-500`} aria-hidden />;
  if (status === 'due-soon') return <Clock className={`${className} text-amber-500`} aria-hidden />;
  return <CheckCircle className={`${className} text-emerald-500`} aria-hidden />;
}

export function StatusBadge({ status, children }: { status: HealthStatus; children?: ReactNode }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${s.badge}`}>
      <StatusIcon status={status} className="w-3.5 h-3.5" />
      {children ?? s.label}
    </span>
  );
}

export function HealthCard({ health, onLog }: { health: ServiceHealth; onLog?: () => void }) {
  const s = STATUS_STYLES[health.status];
  const pct = Math.min(100, Math.round(health.usage * 100));
  return (
    <Card className="p-4 border-l-4 flex flex-col" style={{ borderLeftColor: s.border }}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <h4 className="text-sm font-semibold text-slate-800">{health.rule.serviceType}</h4>
        <StatusIcon status={health.status} />
      </div>
      <p className="text-[11px] text-slate-400 mb-2">{describeRule(health.rule)}</p>
      <div
        className="w-full bg-slate-200 rounded-full h-2 mb-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${health.rule.serviceType} interval used`}
      >
        <div className={`h-2 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs font-medium ${s.text}`}>{describeHealth(health)}</p>
      <div className="flex items-end justify-between gap-2 mt-1 flex-1">
        <p className="text-[11px] text-slate-400">
          {health.lastService ? `Last: ${formatDate(health.lastService.date)} · ${health.lastService.mileage.toLocaleString('en-US')} mi` : 'No record — assumed original'}
        </p>
        {onLog && health.status !== 'good' && (
          <button
            onClick={onLog}
            className="shrink-0 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
            title={`Log ${health.rule.serviceType}`}
          >
            <Plus className="w-3.5 h-3.5" /> Log
          </button>
        )}
      </div>
    </Card>
  );
}
