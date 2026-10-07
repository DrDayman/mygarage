import { useMemo } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MaintenanceLog, Vehicle } from '../types';
import type { FleetAlert } from '../lib/maintenance';
import { describeHealth, fleetAlerts } from '../lib/maintenance';
import { formatCurrency, pluralize } from '../lib/format';
import { sumCost } from '../lib/stats';
import { useThemeColors } from '../hooks/useThemeColors';
import { StatusBadge } from '../components/health';
import { Button, Card, Plate, SectionHeading } from '../components/ui';

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface px-4 py-3 sm:px-5 sm:py-4 min-w-0">
      <dt className="label-caps">{label}</dt>
      <dd className="font-display text-[1.75rem] leading-tight font-semibold tnum text-ink">{value}</dd>
      {sub && <dd className="text-xs text-ink-3">{sub}</dd>}
    </div>
  );
}

export function Dashboard({
  vehicles,
  logs,
  onViewVehicle,
  onAddVehicle,
  onLogService,
}: {
  vehicles: Vehicle[];
  logs: MaintenanceLog[];
  onViewVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onLogService: (alert: FleetAlert) => void;
}) {
  const colors = useThemeColors();
  const alerts = useMemo(() => fleetAlerts(vehicles, logs), [vehicles, logs]);
  const totalSpent = sumCost(logs);
  const activeCount = vehicles.filter((v) => !v.soldDate).length;
  const overdueCount = alerts.filter((a) => a.status === 'overdue').length;
  const dueSoonCount = alerts.length - overdueCount;

  const chartData = useMemo(
    () =>
      vehicles
        .map((v) => ({ name: `${v.make} ${v.model}`, spent: sumCost(logs.filter((l) => l.vehicleId === v.id)) }))
        .filter((d) => d.spent > 0)
        .sort((a, b) => b.spent - a.spent),
    [vehicles, logs],
  );

  const sortedVehicles = [...vehicles].sort((a, b) => Number(Boolean(a.soldDate)) - Number(Boolean(b.soldDate)) || b.year - a.year);

  const summary =
    vehicles.length === 0
      ? 'Add a vehicle to start tracking its service history.'
      : alerts.length === 0
        ? 'Everything is up to date.'
        : [overdueCount && `${pluralize(overdueCount, 'service')} overdue`, dueSoonCount && `${dueSoonCount} due soon`].filter(Boolean).join(', ') + '.';

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Garage</h1>
          <p className={`mt-0.5 ${overdueCount ? 'text-bad font-medium' : 'text-ink-2'}`}>{summary}</p>
        </div>
        <Button onClick={onAddVehicle}>
          <Plus className="w-4 h-4" /> Add vehicle
        </Button>
      </header>

      {vehicles.length > 0 && (
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-md overflow-hidden">
          <Figure label="Vehicles" value={String(activeCount)} sub={vehicles.length > activeCount ? `plus ${vehicles.length - activeCount} sold` : 'in the garage'} />
          <Figure label="Spent on upkeep" value={formatCurrency(totalSpent, { whole: true })} sub="all time" />
          <Figure label="Services logged" value={String(logs.length)} sub={`across ${pluralize(vehicles.length, 'vehicle')}`} />
          <Figure label="Due or overdue" value={String(alerts.length)} sub={overdueCount ? `${overdueCount} overdue` : alerts.length ? 'none overdue' : 'all caught up'} />
        </dl>
      )}

      {alerts.length > 0 && (
        <section>
          <SectionHeading>Service due</SectionHeading>
          <Card className="divide-y divide-line">
            {alerts.map((a) => (
              <div key={`${a.vehicle.id}-${a.rule.serviceType}`} className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2">
                <div className="w-24 shrink-0">
                  <StatusBadge status={a.status} />
                </div>
                <button className="flex-1 min-w-[12rem] text-left cursor-pointer group" onClick={() => onViewVehicle(a.vehicle.id)}>
                  <p className="font-medium text-ink group-hover:underline underline-offset-2">{a.rule.serviceType}</p>
                  <p className="text-sm text-ink-3">
                    {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}
                  </p>
                </button>
                <p className={`text-sm font-medium tnum sm:text-right sm:w-48 ${a.status === 'overdue' ? 'text-bad' : 'text-warn'}`}>{describeHealth(a)}</p>
                <Button size="sm" variant="secondary" className="ml-auto sm:ml-0" onClick={() => onLogService(a)}>
                  Mark done
                </Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-8">
        <section className="min-w-0">
          <SectionHeading aside={<span className="text-sm text-ink-3">{pluralize(vehicles.length, 'vehicle')}</span>}>Vehicles</SectionHeading>
          {vehicles.length === 0 ? (
            <div className="px-6 py-12 text-center border border-dashed border-line-strong rounded-md">
              <p className="font-display text-xl font-semibold text-ink">No vehicles yet</p>
              <p className="text-ink-2 text-sm mt-1 mb-5">Paste a VIN and the make, model and year fill in for you.</p>
              <Button onClick={onAddVehicle}>
                <Plus className="w-4 h-4" /> Add your first vehicle
              </Button>
            </div>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {sortedVehicles.map((vehicle) => {
                const vAlerts = alerts.filter((a) => a.vehicle.id === vehicle.id);
                const worst = vAlerts[0]?.status;
                const worstCount = vAlerts.filter((a) => a.status === worst).length;
                return (
                  <button
                    key={vehicle.id}
                    className="w-full px-4 py-3.5 flex items-center gap-4 text-left cursor-pointer hover:bg-surface-2 transition-colors"
                    onClick={() => onViewVehicle(vehicle.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-display text-xl font-semibold tracking-tight leading-snug ${vehicle.soldDate ? 'text-ink-3' : 'text-ink'}`}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-ink-3">
                        {vehicle.licensePlate && <Plate>{vehicle.licensePlate}</Plate>}
                        <span className="font-mono text-[13px] text-ink-2 tnum">{vehicle.currentMileage.toLocaleString('en-US')} mi</span>
                        <span>{vehicle.fuelType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {vehicle.soldDate ? (
                        <span className="label-caps">Sold</span>
                      ) : worst ? (
                        <StatusBadge status={worst}>
                          {worstCount} {worst === 'overdue' ? 'overdue' : 'due soon'}
                        </StatusBadge>
                      ) : (
                        <StatusBadge status="good">Up to date</StatusBadge>
                      )}
                      <ChevronRight className="w-4 h-4 text-ink-3" />
                    </div>
                  </button>
                );
              })}
            </Card>
          )}
        </section>

        <section className="min-w-0">
          <SectionHeading>Upkeep by vehicle</SectionHeading>
          <Card className="p-4">
            {chartData.length > 0 ? (
              <div style={{ height: Math.max(140, chartData.length * 52 + 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke={colors.line} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: colors.ink3 }}
                      tickFormatter={(v: number) => formatCurrency(v, { whole: true })}
                    />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: colors.ink2 }} />
                    <Tooltip
                      cursor={{ fill: colors.surface2 }}
                      formatter={(v) => [formatCurrency(Number(v)), 'Maintenance']}
                      contentStyle={{ background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 6, color: colors.ink, fontSize: 13 }}
                      labelStyle={{ color: colors.ink, fontWeight: 600 }}
                    />
                    <Bar dataKey="spent" fill={colors.accent} radius={[0, 3, 3, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-ink-3 text-sm">Costs appear here once you log a service.</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
