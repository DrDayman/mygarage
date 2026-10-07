export const FUEL_TYPES = ['Gas', 'Diesel', 'Hybrid', 'EV'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const SERVICE_TYPES = [
  'Oil Change',
  'Tire Rotation',
  'Tire Replacement',
  'Brake Pads',
  'Battery Replacement',
  'Transmission Fluid',
  'Air/Cabin Filter',
  'Inspection',
  'Other',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Dates are stored as local calendar dates in `YYYY-MM-DD` form. */
export type ISODate = string;

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  currentMileage: number;
  fuelType: FuelType;
  vin?: string;
  licensePlate?: string;
  purchaseDate?: ISODate;
  purchasePrice?: number | null;
  soldDate?: ISODate;
  soldPrice?: number | null;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: ISODate;
  serviceType: ServiceType;
  cost: number;
  mileage: number;
  notes?: string;
}

export type NewVehicle = Omit<Vehicle, 'id'>;
export type NewLog = Omit<MaintenanceLog, 'id'>;
