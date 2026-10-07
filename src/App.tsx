import { useState } from 'react';
import { Settings, Wrench } from 'lucide-react';
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
import { Toast } from './components/ui';

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
  /** The odometer can never be lower than the highest mileage on a service record. */
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <a
              href="#/"
              className="flex items-center"
              aria-label="Lube&Log home"
              onClick={(e) => {
                e.preventDefault();
                goHome();
              }}
            >
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Lube&amp;Log</span>
            </a>
            <button
              onClick={() => setDialog({ kind: 'settings' })}
              className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Settings and data"
              title="Settings & data"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 text-xs text-slate-400">
        Data is stored locally in your browser. Use Settings to back it up.
      </footer>

      {renderDialog()}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} type={t.type} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
