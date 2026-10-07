import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Download, Gauge, Pencil, Search, Trash2, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SERVICE_TYPES } from '../types';
import type { MaintenanceLog, ServiceType, Vehicle } from '../types';
import { computeVehicleHealth } from '../lib/maintenance';
import { formatCurrency, formatDate, formatMiles } from '../lib/format';
import { ownershipSummary, spendByYear } from '../lib/stats';
import { downloadFile, logsToCsv } from '../lib/csv';
import { useThemeColors } from '../hooks/useThemeColors';
import { ServiceSchedule } from '../components/health';
import { Button, Card, ConfirmModal, Odometer, Plate, SectionHeading } from '../components/ui';

type SortKey = 'date-desc' | 'date-asc' | 'cost-desc' | 'cost-asc' | 'mileage-desc';

const SORTERS: Record<SortKey, (a: MaintenanceLog, b: MaintenanceLog) => number> = {
  'date-desc': (a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage,
  'date-asc': (a, b) => a.date.localeCompare(b.date) || a.mileage - b.mileage,
  'cost-desc': (a, b) => b.cost - a.cost,
  'cost-asc': (a, b) => a.cost - b.cost,
  'mileage-desc': (a, b) => b.mileage - a.mileage,
};

/** Search, filter and sort the history table. Pure so it can be unit-tested. */
export function filterLogs(logs: MaintenanceLog[], { search, type, sort }: { search: string; type: ServiceType | 'All'; sort: SortKey }) {
  const term = search.trim().toLowerCase();
  return logs
    .filter((l) => type === 'All' || l.serviceType === type)
    .filter((l) => !term || l.serviceType.toLowerCase().includes(term) || (l.notes ?? '').toLowerCase().includes(term))
    .sort(SORTERS[sort]);
}

const controlClass =
  'h-9 text-sm border border-line-strong rounded bg-surface text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25';

/** One line of the cost-of-ownership "invoice". */
function Line({ label, detail, value, strong = false }: { label: string; detail?: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={strong ? 'font-semibold text-ink' : 'text-ink-2'}>
        {label}
        {detail && <span className="text-ink-3 text-xs ml-1.5">{detail}</span>}
      </dt>
      <dd className={`tnum text-right ${strong ? 'font-display text-2xl font-semibold text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}

function ServiceTag({ children }: { children: ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded-sm bg-surface-2 border border-line text-xs font-medium text-ink-2 whitespace-nowrap">{children}</span>;
}

export function VehicleDetail({
  vehicle,
  logs,
  onBack,
  onLogService,
  onEditVehicle,
  onEditLog,
  onUpdateMileage,
  onDeleteVehicle,
  onDeleteLog,
  notify,
}: {
  vehicle: Vehicle;
  logs: MaintenanceLog[];
  onBack: () => void;
  onLogService: (serviceType?: ServiceType) => void;
  onEditVehicle: () => void;
  onEditLog: (log: MaintenanceLog) => void;
  onUpdateMileage: () => void;
  onDeleteVehicle: () => void;
  onDeleteLog: (id: string) => void;
  notify: (message: string) => void;
}) {
  const colors = useThemeColors();
  const [logToDelete, setLogToDelete] = useState<MaintenanceLog | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ServiceType | 'All'>('All');
  const [sort, setSort] = useState<SortKey>('date-desc');

  const vehicleLogs = useMemo(() => logs.filter((l) => l.vehicleId === vehicle.id), [logs, vehicle.id]);
  const visibleLogs = useMemo(() => filterLogs(vehicleLogs, { search, type, sort }), [vehicleLogs, search, type, sort]);
  const health = useMemo(() => computeVehicleHealth(vehicle, vehicleLogs), [vehicle, vehicleLogs]);
  const ownership = useMemo(() => ownershipSummary(vehicle, vehicleLogs), [vehicle, vehicleLogs]);
  const yearly = useMemo(() => spendByYear(vehicleLogs), [vehicleLogs]);
  const isSold = Boolean(vehicle.soldDate);
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const handleExportCSV = () => {
    downloadFile(`${name} service history.csv`, logsToCsv(vehicleLogs, [vehicle]), 'text/csv;charset=utf-8');
    notify('CSV exported.');
  };

  const money = (v: number | null) => (v === null ? '—' : formatCurrency(v, { whole: true }));
  const perYear = [
    ownership.costPerYear !== null && `${money(ownership.costPerYear)} a year all-in`,
    ownership.maintenancePerYear !== null && `${money(ownership.maintenancePerYear)} a year on upkeep`,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Garage
        </button>

        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            <p className="label-caps">{isSold ? `Sold ${formatDate(vehicle.soldDate)}` : vehicle.fuelType}</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none text-ink mt-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-sm text-ink-3">
              {vehicle.licensePlate && <Plate>{vehicle.licensePlate}</Plate>}
              {vehicle.vin && (
                <span>
                  VIN <span className="font-mono text-[13px] text-ink-2 select-all">{vehicle.vin}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="label-caps">Odometer</span>
            <Odometer miles={vehicle.currentMileage} />
            {!isSold && (
              <button onClick={onUpdateMileage} className="inline-flex items-center gap-1 text-sm text-accent hover:underline underline-offset-2 cursor-pointer">
                <Gauge className="w-3.5 h-3.5" /> Update reading
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={() => onLogService()}>
            <Wrench className="w-4 h-4" /> Log service
          </Button>
          <Button variant="secondary" onClick={onEditVehicle}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} disabled={vehicleLogs.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="ghost" className="sm:ml-auto text-bad hover:text-bad" onClick={() => setIsDeletingVehicle(true)} aria-label="Delete vehicle" title="Delete vehicle">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {isSold ? (
        <p className="text-sm text-ink-2 border-l-2 border-line-strong pl-3">
          Service reminders are off because this vehicle was sold. Its history is kept for your records and the cost of ownership below.
        </p>
      ) : (
        <section aria-label="Service schedule">
          <SectionHeading aside={<span className="text-xs text-ink-3 hidden sm:inline">Due at whichever limit comes first</span>}>Service schedule</SectionHeading>
          <ServiceSchedule health={health} onLog={(h) => onLogService(h.rule.serviceType)} />
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8">
        <section className="min-w-0">
          <SectionHeading>Cost of ownership</SectionHeading>
          <Card className="px-4 py-3">
            <dl className="text-sm">
              <Line label="Purchase price" detail={vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : undefined} value={money(ownership.purchasePrice)} />
              <Line label="Maintenance" detail={`${vehicleLogs.length} services`} value={`+ ${money(ownership.maintenance)}`} />
              {isSold && <Line label="Sold for" detail={formatDate(vehicle.soldDate)} value={`− ${money(ownership.soldPrice)}`} />}
              <div className="border-t border-line-strong mt-1.5 pt-1.5">
                <Line strong label={isSold ? 'Net cost' : 'Total so far'} value={money(ownership.netCost)} />
              </div>
            </dl>
            {ownership.purchasePrice === null ? (
              <p className="text-xs text-ink-3 mt-1">
                <button className="text-accent hover:underline cursor-pointer" onClick={onEditVehicle}>
                  Add a purchase price
                </button>{' '}
                to see the full cost.
              </p>
            ) : (
              ownership.yearsOwned !== null && (
                <p className="text-xs text-ink-3 mt-1 tnum">
                  {ownership.yearsOwned.toFixed(1)} years owned{perYear.length ? ` · ${perYear.join(' · ')}` : ''}
                </p>
              )
            )}
          </Card>
        </section>

        <section className="min-w-0">
          <SectionHeading>Upkeep by year</SectionHeading>
          <Card className="p-4">
            <div className="h-48">
              {yearly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearly} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.line} />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.ink3 }} />
                    <YAxis axisLine={false} tickLine={false} width={52} tick={{ fontSize: 11, fill: colors.ink3 }} tickFormatter={(v: number) => formatCurrency(v, { whole: true })} />
                    <Tooltip
                      cursor={{ fill: colors.surface2 }}
                      formatter={(v) => [formatCurrency(Number(v)), 'Spent']}
                      contentStyle={{ background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 6, color: colors.ink, fontSize: 13 }}
                      labelStyle={{ color: colors.ink, fontWeight: 600 }}
                    />
                    <Bar dataKey="spent" fill={colors.accent} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-ink-3 text-sm">No services logged yet.</div>
              )}
            </div>
          </Card>
        </section>
      </div>

      <section>
        <SectionHeading
          aside={
            <span className="text-sm text-ink-3 tnum">
              {visibleLogs.length}
              {visibleLogs.length !== vehicleLogs.length ? ` of ${vehicleLogs.length}` : ''} records
            </span>
          }
        >
          Service history
        </SectionHeading>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                type="search"
                aria-label="Search records"
                placeholder="Search notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${controlClass} w-full pl-8 pr-3`}
              />
            </div>
            <select aria-label="Filter by service" value={type} onChange={(e) => setType(e.target.value as ServiceType | 'All')} className={`${controlClass} pl-2 pr-7 flex-1 sm:flex-none`}>
              <option value="All">All services</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${controlClass} pl-2 pr-7 flex-1 sm:flex-none`}>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="mileage-desc">Highest mileage</option>
              <option value="cost-desc">Highest cost</option>
              <option value="cost-asc">Lowest cost</option>
            </select>
          </div>

          <div className="relative overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="label-caps border-b border-line">
                <tr>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Service</th>
                  <th className="px-4 py-2 font-semibold text-right">Odometer</th>
                  <th className="px-4 py-2 font-semibold text-right">Cost</th>
                  <th className="px-4 py-2 font-semibold">Notes</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-3">
                      {vehicleLogs.length === 0 ? (
                        <>
                          No service records yet.{' '}
                          <button className="text-accent hover:underline cursor-pointer" onClick={() => onLogService()}>
                            Log the first one
                          </button>
                        </>
                      ) : (
                        'No records match your search.'
                      )}
                    </td>
                  </tr>
                ) : (
                  visibleLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 text-ink whitespace-nowrap tnum">{formatDate(log.date)}</td>
                      <td className="px-4 py-3">
                        <ServiceTag>{log.serviceType}</ServiceTag>
                      </td>
                      <td className="px-4 py-3 text-ink-2 text-right font-mono text-[13px] tnum whitespace-nowrap">{log.mileage.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-ink font-medium text-right tnum">{formatCurrency(log.cost)}</td>
                      <td className="px-4 py-3 text-ink-2 max-w-xs truncate" title={log.notes}>
                        {log.notes || <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => onEditLog(log)} className="text-ink-3 hover:text-ink p-1 cursor-pointer" aria-label={`Edit ${log.serviceType} record`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setLogToDelete(log)} className="text-ink-3 hover:text-bad p-1 ml-1 cursor-pointer" aria-label={`Delete ${log.serviceType} record`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phones: stacked entries instead of a sideways-scrolling table. */}
          <ul className="md:hidden divide-y divide-line">
            {visibleLogs.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-3">{vehicleLogs.length === 0 ? 'No service records yet.' : 'No records match your search.'}</li>
            )}
            {visibleLogs.map((log) => (
              <li key={log.id} className="px-4 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{log.serviceType}</span>
                    <span className="font-medium text-ink tnum">{formatCurrency(log.cost)}</span>
                  </div>
                  <p className="text-xs text-ink-3 mt-0.5 tnum">
                    {formatDate(log.date)} · {formatMiles(log.mileage)}
                  </p>
                  {log.notes && <p className="text-sm text-ink-2 mt-1">{log.notes}</p>}
                </div>
                <div className="flex flex-col">
                  <button onClick={() => onEditLog(log)} className="text-ink-3 hover:text-ink p-1 cursor-pointer" aria-label={`Edit ${log.serviceType} record`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setLogToDelete(log)} className="text-ink-3 hover:text-bad p-1 cursor-pointer" aria-label={`Delete ${log.serviceType} record`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {logToDelete && (
        <ConfirmModal
          title="Delete record?"
          message={`The ${logToDelete.serviceType} record from ${formatDate(logToDelete.date)} will be removed. This can't be undone.`}
          onCancel={() => setLogToDelete(null)}
          onConfirm={() => {
            onDeleteLog(logToDelete.id);
            setLogToDelete(null);
          }}
        />
      )}

      {isDeletingVehicle && (
        <ConfirmModal
          title="Delete vehicle?"
          message={`The ${name} and all ${vehicleLogs.length} of its service records will be removed. This can't be undone.`}
          onCancel={() => setIsDeletingVehicle(false)}
          onConfirm={() => {
            setIsDeletingVehicle(false);
            onDeleteVehicle();
          }}
        />
      )}
    </div>
  );
}
