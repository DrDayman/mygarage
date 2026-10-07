import { useMemo } from 'react';
import { Activity, Car, ChevronRight, DollarSign, Plus, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MaintenanceLog, Vehicle } from '../types';
import type { FleetAlert } from '../lib/maintenance';
import { describeHealth, fleetAlerts } from '../lib/maintenance';
import { formatCurrency, formatMiles } from '../lib/format';
import { sumCost } from '../lib/stats';
import { StatusBadge, StatusIcon } from '../components/health';
import { Button, Card } from '../components/ui';

function StatTile({ icon: Icon, tone, label, value, sub }: { icon: typeof Car; tone: string; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${tone}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </Card>
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
  const alerts = useMemo(() => fleetAlerts(vehicles, logs), [vehicles, logs]);
  const totalSpent = sumCost(logs);
  const activeCount = vehicles.filter((v) => !v.soldDate).length;
  const overdueCount = alerts.filter((a) => a.status === 'overdue').length;

  const chartData = useMemo(
    () =>
      vehicles
        .map((v) => ({ name: `${v.make} ${v.model}`, spent: sumCost(logs.filter((l) => l.vehicleId === v.id)) }))
        .sort((a, b) => b.spent - a.spent),
    [vehicles, logs],
  );

  // Ordered: vehicles you still own first, then sold, newest model year first.
  const sortedVehicles = [...vehicles].sort((a, b) => Number(Boolean(a.soldDate)) - Number(Boolean(b.soldDate)) || b.year - a.year);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Garage</h1>
          <p className="text-sm text-slate-500">Maintenance history, upcoming service and running costs for every vehicle.</p>
        </div>
        <Button onClick={onAddVehicle}>
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Car}
          tone="bg-blue-100 text-blue-600"
          label="Vehicles"
          value={String(activeCount)}
          sub={vehicles.length > activeCount ? `+ ${vehicles.length - activeCount} sold` : undefined}
        />
        <StatTile icon={DollarSign} tone="bg-emerald-100 text-emerald-600" label="Maintenance Spend" value={formatCurrency(totalSpent, { whole: true })} sub="all time" />
        <StatTile icon={Activity} tone="bg-purple-100 text-purple-600" label="Services Logged" value={String(logs.length)} />
        <StatTile
          icon={Wrench}
          tone={overdueCount ? 'bg-red-100 text-red-600' : alerts.length ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}
          label="Needs Attention"
          value={String(alerts.length)}
          sub={overdueCount ? `${overdueCount} overdue` : alerts.length ? 'due soon' : 'all caught up'}
        />
      </div>

      {alerts.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/60">
            <h2 className="font-semibold text-slate-800">Upcoming & Overdue Service</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <li key={`${a.vehicle.id}-${a.rule.serviceType}`} className="px-5 py-3 flex items-center gap-3">
                <StatusIcon status={a.status} className="w-5 h-5 shrink-0" />
                <button className="flex-1 min-w-0 text-left cursor-pointer group" onClick={() => onViewVehicle(a.vehicle.id)}>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
                    {a.rule.serviceType} <span className="text-slate-400 font-normal">·</span>{' '}
                    <span className="text-slate-600 font-normal">
                      {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}
                    </span>
                  </p>
                  <p className={`text-xs ${a.status === 'overdue' ? 'text-red-600' : 'text-amber-700'}`}>{describeHealth(a)}</p>
                </button>
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => onLogService(a)}>
                  Mark done
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Vehicles</h2>
          {vehicles.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border-2 border-slate-200 border-dashed">
              <Car className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Your garage is empty</p>
              <p className="text-slate-500 text-sm mb-4">Add a vehicle — or paste its VIN and we'll fill in the details.</p>
              <Button onClick={onAddVehicle}>
                <Plus className="w-4 h-4 mr-2" /> Add your first vehicle
              </Button>
            </div>
          ) : (
            sortedVehicles.map((vehicle) => {
              const vAlerts = alerts.filter((a) => a.vehicle.id === vehicle.id);
              const worst = vAlerts[0]?.status;
              const worstCount = vAlerts.filter((a) => a.status === worst).length;
              return (
                <Card key={vehicle.id} className={`hover:shadow-md transition-shadow ${vehicle.soldDate ? 'opacity-75' : ''}`}>
                  <button className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer" onClick={() => onViewVehicle(vehicle.id)}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                        <Car className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          {vehicle.soldDate && (
                            <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">Sold</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {formatMiles(vehicle.currentMileage)} · {vehicle.fuelType}
                          {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {worst ? (
                        <StatusBadge status={worst}>{worstCount} {worst === 'overdue' ? 'overdue' : 'due soon'}</StatusBadge>
                      ) : (
                        !vehicle.soldDate && <StatusBadge status="good">Up to date</StatusBadge>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Spend by Vehicle</h2>
          <Card className="p-4 h-72">
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => formatCurrency(v, { whole: true })} />
                  <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(v) => [formatCurrency(Number(v)), 'Maintenance']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="spent" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No cost data yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
