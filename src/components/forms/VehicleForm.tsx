import { useState } from 'react';
import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { FUEL_TYPES } from '../../types';
import type { FuelType, NewVehicle, Vehicle } from '../../types';
import { decodeVin, normalizeVin, validateVin } from '../../lib/vin';
import { todayISO } from '../../lib/format';
import { Button, FormActions, Modal, SelectInput, TextInput } from '../ui';

export type VehicleFormValues = Record<
  'vin' | 'make' | 'model' | 'year' | 'currentMileage' | 'licensePlate' | 'purchaseDate' | 'purchasePrice' | 'soldDate' | 'soldPrice',
  string
> & { fuelType: FuelType };
type Errors = Partial<Record<keyof VehicleFormValues, string>>;

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(v));

function initialValues(vehicle?: Vehicle): VehicleFormValues {
  return {
    vin: str(vehicle?.vin),
    make: str(vehicle?.make),
    model: str(vehicle?.model),
    year: str(vehicle?.year),
    currentMileage: str(vehicle?.currentMileage),
    fuelType: vehicle?.fuelType ?? 'Gas',
    licensePlate: str(vehicle?.licensePlate),
    purchaseDate: str(vehicle?.purchaseDate),
    purchasePrice: str(vehicle?.purchasePrice),
    soldDate: str(vehicle?.soldDate),
    soldPrice: str(vehicle?.soldPrice),
  };
}

export function validateVehicle(v: VehicleFormValues, minMileage = 0, today = todayISO()): Errors {
  const errors: Errors = {};
  const maxYear = Number(today.slice(0, 4)) + 1;
  const year = Number(v.year);
  if (!v.make.trim()) errors.make = 'Required';
  if (!v.model.trim()) errors.model = 'Required';
  if (!Number.isInteger(year) || year < 1900 || year > maxYear) errors.year = `Enter a year between 1900 and ${maxYear}`;
  const mileage = Number(v.currentMileage);
  if (v.currentMileage === '' || !Number.isFinite(mileage) || mileage < 0) errors.currentMileage = 'Enter the odometer reading';
  else if (mileage < minMileage) errors.currentMileage = `Can't be below the latest service record (${minMileage.toLocaleString('en-US')} mi)`;
  if (v.vin) errors.vin = validateVin(v.vin) ?? undefined;
  if (v.purchaseDate && v.purchaseDate > today) errors.purchaseDate = "Can't be in the future";
  if (v.soldDate && v.soldDate > today) errors.soldDate = "Can't be in the future";
  if (v.soldDate && v.purchaseDate && v.soldDate < v.purchaseDate) errors.soldDate = 'Must be after the purchase date';
  if (v.soldPrice && !v.soldDate) errors.soldDate = 'Add a sold date to record a sale price';
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg)) as Errors;
}

function toVehicle(v: VehicleFormValues): NewVehicle {
  const money = (s: string) => (s === '' ? null : Number(s));
  return {
    vin: v.vin || undefined,
    make: v.make.trim(),
    model: v.model.trim(),
    year: Number(v.year),
    currentMileage: Math.round(Number(v.currentMileage)),
    fuelType: v.fuelType,
    licensePlate: v.licensePlate.trim().toUpperCase() || undefined,
    purchaseDate: v.purchaseDate || undefined,
    purchasePrice: money(v.purchasePrice),
    soldDate: v.soldDate || undefined,
    soldPrice: money(v.soldPrice),
  };
}

export function VehicleForm({
  vehicle,
  minMileage,
  onSubmit,
  onClose,
}: {
  vehicle?: Vehicle;
  minMileage?: number;
  onSubmit: (vehicle: NewVehicle) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<VehicleFormValues>(() => initialValues(vehicle));
  const [errors, setErrors] = useState<Errors>({});
  const [decoding, setDecoding] = useState(false);
  const [decodeMessage, setDecodeMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key: Exclude<keyof VehicleFormValues, 'fuelType'>) => ({
    name: key,
    value: values[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  const handleDecode = async () => {
    const vinError = validateVin(values.vin);
    if (vinError) {
      setErrors((prev) => ({ ...prev, vin: vinError }));
      return;
    }
    setDecoding(true);
    setDecodeMessage(null);
    try {
      const decoded = await decodeVin(values.vin);
      setValues((prev) => ({
        ...prev,
        make: decoded.make ?? prev.make,
        model: decoded.model ?? prev.model,
        year: decoded.year ? String(decoded.year) : prev.year,
        fuelType: decoded.fuelType ?? prev.fuelType,
      }));
      setErrors({});
      const name = [decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ');
      setDecodeMessage({ ok: true, text: `Found ${name}. Review the details below.` });
    } catch (err) {
      const reason = err instanceof Error && err.message.startsWith('No vehicle') ? err.message : "Couldn't reach the VIN service.";
      setDecodeMessage({ ok: false, text: `${reason} You can enter the details manually.` });
    } finally {
      setDecoding(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateVehicle(values, minMileage);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(toVehicle(values));
  };

  const isEdit = Boolean(vehicle);

  return (
    <Modal title={isEdit ? `Edit ${vehicle!.year} ${vehicle!.make} ${vehicle!.model}` : 'Add vehicle'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="bg-surface-2 p-3.5 rounded-md border border-line">
          <label htmlFor="vin" className="block text-[13px] font-medium text-ink-2 mb-1">
            VIN {isEdit ? '' : <span className="text-ink-3 font-normal">(optional) · decode it to fill in the details</span>}
          </label>
          <div className="flex gap-2">
            <input
              id="vin"
              name="vin"
              value={values.vin}
              onChange={(e) => {
                set('vin', normalizeVin(e.target.value));
                setDecodeMessage(null);
              }}
              placeholder="17-character VIN"
              maxLength={17}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.vin ? true : undefined}
              className="flex-1 min-w-0 h-10 px-3 border border-line-strong rounded bg-surface text-ink font-mono text-sm tracking-[0.08em] uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-ink-3/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-bad"
            />
            <Button variant="secondary" className="h-10" onClick={handleDecode} disabled={decoding || values.vin.length === 0}>
              {decoding ? (
                'Decoding…'
              ) : (
                <>
                  <Search className="w-4 h-4" /> Decode
                </>
              )}
            </Button>
          </div>
          <p className="text-xs mt-1.5 text-ink-3 tnum">
            {values.vin.length}/17
            {errors.vin && <span className="text-bad"> · {errors.vin}</span>}
            {decodeMessage && <span className={decodeMessage.ok ? 'text-ok' : 'text-bad'}> · {decodeMessage.text}</span>}
          </p>
        </div>

        <h3 className="label-caps pt-1">Vehicle</h3>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Make" placeholder="e.g. Toyota" {...bind('make')} />
          <TextInput label="Model" placeholder="e.g. Camry" {...bind('model')} />
          <TextInput label="Year" type="number" inputMode="numeric" placeholder="2024" {...bind('year')} />
          <TextInput label="Current mileage" type="number" inputMode="numeric" min={0} placeholder="50000" {...bind('currentMileage')} />
          <SelectInput label="Fuel type" name="fuelType" options={FUEL_TYPES} value={values.fuelType} onChange={(e) => set('fuelType', e.target.value as FuelType)} />
          <TextInput label="License plate" placeholder="ABC-1234" {...bind('licensePlate')} />
        </div>

        <div className="pt-2">
          <h3 className="label-caps">Ownership</h3>
          <p className="text-xs text-ink-3 mt-0.5">Optional. Used to work out the cost of ownership.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Purchase date" type="date" max={todayISO()} {...bind('purchaseDate')} />
          <TextInput label="Purchase price ($)" type="number" step="0.01" min={0} placeholder="0.00" {...bind('purchasePrice')} />
          <TextInput label="Sold date" type="date" max={todayISO()} {...bind('soldDate')} />
          <TextInput label="Sold price ($)" type="number" step="0.01" min={0} placeholder="0.00" {...bind('soldPrice')} />
        </div>

        <FormActions onCancel={onClose} submitLabel={isEdit ? 'Save changes' : 'Add vehicle'} />
      </form>
    </Modal>
  );
}
