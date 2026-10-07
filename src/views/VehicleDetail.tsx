import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowLeft, ArrowUpDown, Download, Filter, Gauge, Hash, Pencil, Search, Tag, Trash2, Wrench, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SERVICE_TYPES } from '../types';
import type { MaintenanceLog, ServiceType, Vehicle } from '../types';
import { computeVehicleHealth } from '../lib/maintenance';
import { formatCurrency, formatDate, formatMiles } from '../lib/format';
import { ownershipSummary, spendByYear } from '../lib/stats';
import { downloadFile, logsToCsv } from '../lib/csv';
import { HealthCard } from '../components/health';
import { Button, Card, ConfirmModal } from '../components/ui';

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

function Chip({ icon: Icon, children, className = '' }: { icon: typeof Tag; children: ReactNode; className?: string }) {
  return (
    <span className="inline-flex items-center bg-slate-100 px-2 py-1 rounded-md text-sm font-medium text-slate-700">
      <Icon className={`w-4 h-4 mr-1 ${className}`} /> {children}
    </span>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-lg font-bold text-slate-900 tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-slate-400">{sub}</dd>}
    </div>
  );
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

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Garage
      </button>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
            {isSold && <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">Sold</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Chip icon={Activity}>{formatMiles(vehicle.currentMileage)}</Chip>
            <Chip icon={Zap} className="text-amber-500">{vehicle.fuelType}</Chip>
            {vehicle.licensePlate && <Chip icon={Tag} className="text-blue-500">{vehicle.licensePlate}</Chip>}
            {vehicle.vin && (
              <Chip icon={Hash} className="text-slate-500">
                <span className="font-mono text-xs">{vehicle.vin}</span>
              </Chip>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSold && (
            <Button variant="secondary" onClick={onUpdateMileage}>
              <Gauge className="w-4 h-4 mr-2" /> Update Mileage
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportCSV} disabled={vehicleLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="secondary" onClick={onEditVehicle}>
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeletingVehicle(true)} title="Delete vehicle" aria-label="Delete vehicle">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => onLogService()}>
            <Wrench className="w-4 h-4 mr-2" /> Log Service
          </Button>
        </div>
      </div>

      {isSold ? (
        <Card className="p-4 text-sm text-slate-600 bg-slate-50">
          Sold on <strong>{formatDate(vehicle.soldDate)}</strong> — service reminders are turned off. History is kept for your records and cost of ownership.
        </Card>
      ) : (
        <section aria-label="Service schedule">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Service Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {health.map((h) => (
              <HealthCard key={h.rule.serviceType} health={h} onLog={() => onLogService(h.rule.serviceType)} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">Cost of Ownership</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Metric label="Purchase" value={money(ownership.purchasePrice)} sub={vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : 'not set'} />
            <Metric label="Maintenance" value={money(ownership.maintenance)} sub={`${vehicleLogs.length} services`} />
            {isSold && <Metric label="Sold for" value={money(ownership.soldPrice)} sub={formatDate(vehicle.soldDate)} />}
            <Metric
              label={isSold ? 'Net cost' : 'Total invested'}
              value={money(ownership.netCost)}
              sub={ownership.yearsOwned !== null ? `${ownership.yearsOwned.toFixed(1)} years owned` : undefined}
            />
            <Metric label="Maintenance / yr" value={money(ownership.maintenancePerYear)} />
            {isSold && <Metric label="Net cost / yr" value={money(ownership.costPerYear)} sub="depreciation + upkeep" />}
          </dl>
          {ownership.purchasePrice === null && (
            <p className="text-xs text-slate-400 mt-4">
              Add a purchase price via <button className="underline cursor-pointer" onClick={onEditVehicle}>Edit</button> to see total cost.
            </p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h2 className="font-semibold text-slate-800 mb-4">Maintenance Spend by Year</h2>
          <div className="h-52">
            {yearly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearly} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => formatCurrency(v, { whole: true })} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spent']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="spent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No services logged yet.</div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="font-semibold text-slate-800">
            Maintenance History <span className="text-slate-400 font-normal text-sm">({visibleLogs.length}{visibleLogs.length !== vehicleLogs.length ? ` of ${vehicleLogs.length}` : ''})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search records"
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="sr-only">Filter by service</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ServiceType | 'All')}
                className="text-sm border border-slate-300 rounded-md py-1.5 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="All">All services</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="sr-only">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="text-sm border border-slate-300 rounded-md py-1.5 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="mileage-desc">Highest mileage</option>
                <option value="cost-desc">Highest cost</option>
                <option value="cost-asc">Lowest cost</option>
              </select>
            </label>
          </div>
        </div>

        <div className="relative overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3 text-right">Mileage</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    {vehicleLogs.length === 0 ? (
                      <>
                        No maintenance records yet.{' '}
                        <button className="text-blue-600 hover:underline cursor-pointer" onClick={() => onLogService()}>
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
                  <tr key={log.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{formatDate(log.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">{log.serviceType}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-right tabular-nums whitespace-nowrap">{log.mileage.toLocaleString('en-US')}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium text-right tabular-nums">{formatCurrency(log.cost)}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={log.notes}>
                      {log.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => onEditLog(log)} className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer" aria-label={`Edit ${log.serviceType} record`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLogToDelete(log)} className="text-slate-400 hover:text-red-600 transition-colors p-1 ml-2 cursor-pointer" aria-label={`Delete ${log.serviceType} record`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phones: stacked cards instead of a sideways-scrolling table. */}
        <ul className="md:hidden divide-y divide-slate-100">
          {visibleLogs.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-slate-500">
              {vehicleLogs.length === 0 ? 'No maintenance records yet.' : 'No records match your search.'}
            </li>
          )}
          {visibleLogs.map((log) => (
            <li key={log.id} className="px-5 py-4 flex gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">{log.serviceType}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(log.cost)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDate(log.date)} · {formatMiles(log.mileage)}
                </p>
                {log.notes && <p className="text-sm text-slate-600 mt-1">{log.notes}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => onEditLog(log)} className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer" aria-label={`Edit ${log.serviceType} record`}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setLogToDelete(log)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" aria-label={`Delete ${log.serviceType} record`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {logToDelete && (
        <ConfirmModal
          title="Delete Maintenance Record"
          message={`Delete the ${logToDelete.serviceType} record from ${formatDate(logToDelete.date)}? This can't be undone.`}
          onCancel={() => setLogToDelete(null)}
          onConfirm={() => {
            onDeleteLog(logToDelete.id);
            setLogToDelete(null);
          }}
        />
      )}

      {isDeletingVehicle && (
        <ConfirmModal
          title="Delete Vehicle"
          message={`Remove the ${name} and all ${vehicleLogs.length} of its service records? This can't be undone.`}
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
