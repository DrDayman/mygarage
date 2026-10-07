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
  /** Omit to add a new vehicle. */
  vehicle?: Vehicle;
  /** Highest mileage on any service record — the odometer can't go below it. */
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
    <Modal title={isEdit ? `Edit ${vehicle!.year} ${vehicle!.make} ${vehicle!.model}` : 'Add New Vehicle'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <label htmlFor="vin" className="block text-sm font-semibold text-blue-800 mb-2">
            VIN {isEdit ? '' : <span className="font-normal text-blue-700">— decode to auto-fill (optional)</span>}
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
              className="flex-1 min-w-0 px-3 py-2 border border-blue-200 rounded-lg bg-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400"
            />
            <Button onClick={handleDecode} disabled={decoding || values.vin.length === 0}>
              {decoding ? (
                'Decoding…'
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" /> Decode
                </>
              )}
            </Button>
          </div>
          <p className="text-xs mt-1 text-slate-500">
            {values.vin.length}/17
            {errors.vin && <span className="text-red-600"> · {errors.vin}</span>}
            {decodeMessage && <span className={decodeMessage.ok ? 'text-emerald-700' : 'text-red-600'}> · {decodeMessage.text}</span>}
          </p>
        </div>

        <h3 className="font-semibold text-slate-800 border-b border-slate-200 pb-2">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Make" placeholder="e.g. Toyota" {...bind('make')} />
          <TextInput label="Model" placeholder="e.g. Camry" {...bind('model')} />
          <TextInput label="Year" type="number" inputMode="numeric" placeholder="2024" {...bind('year')} />
          <TextInput label="Current Mileage" type="number" inputMode="numeric" min={0} placeholder="50000" {...bind('currentMileage')} />
          <SelectInput label="Fuel Type" name="fuelType" options={FUEL_TYPES} value={values.fuelType} onChange={(e) => set('fuelType', e.target.value as FuelType)} />
          <TextInput label="License Plate" placeholder="ABC-1234" {...bind('licensePlate')} />
        </div>

        <h3 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 pt-2">
          Ownership <span className="font-normal text-slate-500 text-sm">(optional — powers cost of ownership)</span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Purchase Date" type="date" max={todayISO()} {...bind('purchaseDate')} />
          <TextInput label="Purchase Price ($)" type="number" step="0.01" min={0} placeholder="0.00" {...bind('purchasePrice')} />
          <TextInput label="Sold Date" type="date" max={todayISO()} {...bind('soldDate')} />
          <TextInput label="Sold Price ($)" type="number" step="0.01" min={0} placeholder="0.00" {...bind('soldPrice')} />
        </div>

        <FormActions onCancel={onClose} submitLabel={isEdit ? 'Save Changes' : 'Save Vehicle'} />
      </form>
    </Modal>
  );
}
