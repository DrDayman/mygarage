import { useState } from 'react';
import { Settings } from 'lucide-react';
import type { ServiceType } from './types';
import { useGarage } from './hooks/useGarage';
import { useHashRoute } from './hooks/useHashRoute';
import { useToasts } from './hooks/useToasts';
import { Dashboard } from './views/Dashboard';
import { VehicleDetail } from './views/VehicleDetail';
import { VehicleForm } from './components/forms/VehicleForm';
import { LogForm } from './components/forms/LogForm';
import { MileageForm } from './components/forms/MileageForm';
import { SettingsModal } from './components/SettingsModal';
import { Button, Toast } from './components/ui';

type Dialog =
  | { kind: 'add-vehicle' }
  | { kind: 'edit-vehicle'; vehicleId: string }
  | { kind: 'mileage'; vehicleId: string }
  | { kind: 'add-log'; vehicleId: string; serviceType?: ServiceType }
  | { kind: 'edit-log'; logId: string }
  | { kind: 'settings' }
  | null;

export default function App() {
  const garage = useGarage();
  const { vehicles, logs } = garage;
  const { toasts, notify, dismiss } = useToasts();
  const { route, navigate } = useHashRoute();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const findVehicle = (id: string) => vehicles.find((v) => v.id === id);
  const maxLogMileage = (vehicleId: string) => Math.max(0, ...logs.filter((l) => l.vehicleId === vehicleId).map((l) => l.mileage));

  const selectedVehicle = route.view === 'vehicle' ? findVehicle(route.vehicleId) : undefined;
  const goHome = () => navigate({ view: 'dashboard' });

  const renderDialog = () => {
    if (!dialog) return null;
    switch (dialog.kind) {
      case 'add-vehicle':
        return (
          <VehicleForm
            onClose={close}
            onSubmit={(data) => {
              const vehicle = garage.addVehicle(data);
              close();
              navigate({ view: 'vehicle', vehicleId: vehicle.id });
              notify(`${vehicle.year} ${vehicle.make} ${vehicle.model} added to your garage.`);
            }}
          />
        );
      case 'edit-vehicle': {
        const vehicle = findVehicle(dialog.vehicleId);
        if (!vehicle) return null;
        return (
          <VehicleForm
            vehicle={vehicle}
            minMileage={maxLogMileage(vehicle.id)}
            onClose={close}
            onSubmit={(data) => {
              garage.updateVehicle({ ...data, id: vehicle.id });
              close();
              notify('Vehicle details updated.');
            }}
          />
        );
      }
      case 'mileage': {
        const vehicle = findVehicle(dialog.vehicleId);
        if (!vehicle) return null;
        return (
          <MileageForm
            vehicle={vehicle}
            minMileage={maxLogMileage(vehicle.id)}
            onClose={close}
            onSubmit={(mileage) => {
              garage.setMileage(vehicle.id, mileage);
              close();
              notify('Mileage updated.');
            }}
          />
        );
      }
      case 'add-log': {
        const vehicle = findVehicle(dialog.vehicleId);
        if (!vehicle) return null;
        return (
          <LogForm
            vehicle={vehicle}
            defaultServiceType={dialog.serviceType}
            onClose={close}
            onSubmit={(data) => {
              garage.addLog(data);
              close();
              notify(`${data.serviceType} logged.`);
            }}
          />
        );
      }
      case 'edit-log': {
        const log = logs.find((l) => l.id === dialog.logId);
        const vehicle = log && findVehicle(log.vehicleId);
        if (!log || !vehicle) return null;
        return (
          <LogForm
            vehicle={vehicle}
            log={log}
            onClose={close}
            onSubmit={(data) => {
              garage.updateLog({ ...data, id: log.id });
              close();
              notify('Record updated.');
            }}
          />
        );
      }
      case 'settings':
        return <SettingsModal vehicles={vehicles} logs={logs} onReplaceAll={garage.replaceAll} onClose={close} notify={notify} />;
    }
  };

  return (
    <div className="min-h-screen bg-ground text-ink">
      <nav className="bg-surface border-b border-line sticky top-[env(safe-area-inset-top,0px)] z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <a
              href="#/"
              className="flex items-center gap-2 rounded"
              aria-label="myGarage home"
              onClick={(e) => {
                e.preventDefault();
                goHome();
              }}
            >
              <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden>
                <rect width="32" height="32" rx="6" className="fill-ink" />
                <path d="M7 21a9 9 0 0 1 18 0" fill="none" className="stroke-on-ink" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M16 21l5-6" className="stroke-accent" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="16" cy="21" r="2" className="fill-on-ink" />
              </svg>
              <span className="font-display text-[1.375rem] leading-none tracking-tight">
                <span className="font-medium text-ink-3">my</span>
                <span className="font-bold text-ink">Garage</span>
              </span>
            </a>
            <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'settings' })} aria-label="Settings and data" title="Settings & data">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Data &amp; settings</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12">
        {selectedVehicle ? (
          <VehicleDetail
            key={selectedVehicle.id}
            vehicle={selectedVehicle}
            logs={logs}
            onBack={goHome}
            onLogService={(serviceType) => setDialog({ kind: 'add-log', vehicleId: selectedVehicle.id, serviceType })}
            onEditVehicle={() => setDialog({ kind: 'edit-vehicle', vehicleId: selectedVehicle.id })}
            onEditLog={(log) => setDialog({ kind: 'edit-log', logId: log.id })}
            onUpdateMileage={() => setDialog({ kind: 'mileage', vehicleId: selectedVehicle.id })}
            onDeleteVehicle={() => {
              garage.deleteVehicle(selectedVehicle.id);
              navigate({ view: 'dashboard' }, { replace: true });
              notify('Vehicle and its records removed.');
            }}
            onDeleteLog={(id) => {
              garage.deleteLog(id);
              notify('Record deleted.');
            }}
            notify={notify}
          />
        ) : (
          <Dashboard
            vehicles={vehicles}
            logs={logs}
            onViewVehicle={(vehicleId) => navigate({ view: 'vehicle', vehicleId })}
            onAddVehicle={() => setDialog({ kind: 'add-vehicle' })}
            onLogService={(alert) => setDialog({ kind: 'add-log', vehicleId: alert.vehicle.id, serviceType: alert.rule.serviceType })}
          />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-xs text-ink-3">
        Your data stays in this browser. Download a backup from Data &amp; settings to move it to another device.
      </footer>

      {renderDialog()}

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-[100] flex flex-col items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} type={t.type} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
