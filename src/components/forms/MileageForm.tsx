import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Vehicle } from '../../types';
import { FormActions, Modal, TextInput } from '../ui';

export function MileageForm({
  vehicle,
  minMileage,
  onSubmit,
  onClose,
}: {
  vehicle: Vehicle;
  minMileage: number;
  onSubmit: (mileage: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(vehicle.currentMileage));
  const [error, setError] = useState<string>();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mileage = Number(value);
    if (value === '' || !Number.isFinite(mileage) || mileage < 0) return setError('Enter the odometer reading');
    if (mileage < minMileage) return setError(`Can't be below the latest service record (${minMileage.toLocaleString('en-US')} mi)`);
    onSubmit(Math.round(mileage));
  };

  return (
    <Modal title={`Update Mileage · ${vehicle.make} ${vehicle.model}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextInput
          label="Current odometer reading"
          type="number"
          inputMode="numeric"
          min={minMileage}
          value={value}
          error={error}
          hint={`Previously ${vehicle.currentMileage.toLocaleString('en-US')} mi. Service reminders recalculate instantly.`}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
        />
        <FormActions onCancel={onClose} submitLabel="Save Mileage" />
      </form>
    </Modal>
  );
}
