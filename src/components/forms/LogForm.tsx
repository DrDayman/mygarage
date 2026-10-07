import { useState } from 'react';
import type { FormEvent } from 'react';
import { SERVICE_TYPES } from '../../types';
import type { MaintenanceLog, NewLog, ServiceType, Vehicle } from '../../types';
import { todayISO } from '../../lib/format';
import { FormActions, Modal, SelectInput, TextArea, TextInput } from '../ui';

type Errors = Partial<Record<'date' | 'mileage' | 'cost', string>>;

export function LogForm({
  vehicle,
  log,
  defaultServiceType,
  onSubmit,
  onClose,
}: {
  vehicle: Vehicle;
  /** Omit to create a new record. */
  log?: MaintenanceLog;
  defaultServiceType?: ServiceType;
  onSubmit: (log: NewLog) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(log?.date ?? todayISO());
  const [serviceType, setServiceType] = useState<ServiceType>(log?.serviceType ?? defaultServiceType ?? 'Oil Change');
  const [mileage, setMileage] = useState(String(log?.mileage ?? vehicle.currentMileage));
  const [cost, setCost] = useState(log ? String(log.cost) : '');
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const mileageNum = Number(mileage);
  const bumpsOdometer = mileage !== '' && mileageNum > vehicle.currentMileage;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!date) found.date = 'Required';
    else if (date > todayISO()) found.date = "Can't log a service in the future";
    if (mileage === '' || !Number.isFinite(mileageNum) || mileageNum < 0) found.mileage = 'Enter the odometer reading';
    const costNum = Number(cost);
    if (cost === '' || !Number.isFinite(costNum) || costNum < 0) found.cost = 'Enter a cost (0 if free)';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit({
      vehicleId: vehicle.id,
      date,
      serviceType,
      mileage: Math.round(mileageNum),
      cost: Math.round(costNum * 100) / 100,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={log ? 'Edit service record' : `Log service · ${vehicle.make} ${vehicle.model}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <SelectInput label="Service type" options={SERVICE_TYPES} value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)} />
        <TextInput label="Date" type="date" max={todayISO()} value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Odometer at service"
            type="number"
            inputMode="numeric"
            min={0}
            value={mileage}
            error={errors.mileage}
            hint={bumpsOdometer ? `Odometer will update to ${mileageNum.toLocaleString('en-US')} mi` : undefined}
            onChange={(e) => setMileage(e.target.value)}
          />
          <TextInput
            label="Cost ($)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="0.00"
            value={cost}
            error={errors.cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <TextArea label="Notes (optional)" rows={3} placeholder="Parts used, shop, warranty info…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <FormActions onCancel={onClose} submitLabel={log ? 'Save changes' : 'Save record'} />
      </form>
    </Modal>
  );
}
