import type { MaintenanceLog, Vehicle } from '../types';
import { addDays, todayISO } from '../lib/format';

export function createSeedData(today = todayISO()): { vehicles: Vehicle[]; logs: MaintenanceLog[] } {
  const ago = (days: number) => addDays(today, -days);

  const vehicles: Vehicle[] = [
    {
      id: 'v1',
      year: 2018,
      make: 'Toyota',
      model: 'Tacoma',
      currentMileage: 62_500,
      fuelType: 'Gas',
      vin: '3TMCZ5AN1JM123456',
      licensePlate: 'ABC-1234',
      purchaseDate: '2018-05-10',
      purchasePrice: 32_000,
    },
    {
      id: 'v2',
      year: 2021,
      make: 'Tesla',
      model: 'Model 3',
      currentMileage: 28_000,
      fuelType: 'EV',
      vin: '5YJ3E1EA5MF000000',
      licensePlate: 'EV-9999',
      purchaseDate: '2021-08-15',
      purchasePrice: 45_000,
    },
    {
      id: 'v3',
      year: 2012,
      make: 'Honda',
      model: 'Civic',
      currentMileage: 118_400,
      fuelType: 'Gas',
      licensePlate: 'OLD-CVC',
      purchaseDate: '2014-03-22',
      purchasePrice: 14_500,
      soldDate: '2021-07-30',
      soldPrice: 7_200,
    },
  ];

  const logs: MaintenanceLog[] = [
    { id: 'l1', vehicleId: 'v1', date: ago(520), serviceType: 'Oil Change', cost: 79.99, mileage: 48_100, notes: 'Full synthetic 0W-20.' },
    { id: 'l2', vehicleId: 'v1', date: ago(600), serviceType: 'Tire Replacement', cost: 980, mileage: 45_000, notes: '4x BFGoodrich KO2, mounted & balanced.' },
    { id: 'l3', vehicleId: 'v1', date: ago(1450), serviceType: 'Transmission Fluid', cost: 189, mileage: 30_000, notes: 'Drain and fill, ATF WS.' },
    { id: 'l4', vehicleId: 'v1', date: ago(810), serviceType: 'Air/Cabin Filter', cost: 54.5, mileage: 38_000, notes: 'Engine + cabin filters.' },
    { id: 'l5', vehicleId: 'v1', date: ago(330), serviceType: 'Oil Change', cost: 85.5, mileage: 53_100, notes: 'Full synthetic.' },
    { id: 'l6', vehicleId: 'v1', date: ago(150), serviceType: 'Oil Change', cost: 89.99, mileage: 58_200, notes: 'Full synthetic + new drain plug washer.' },
    { id: 'l7', vehicleId: 'v1', date: ago(120), serviceType: 'Tire Rotation', cost: 40, mileage: 60_000, notes: 'Rotated and balanced.' },
    { id: 'l8', vehicleId: 'v1', date: ago(100), serviceType: 'Inspection', cost: 35, mileage: 60_900, notes: 'State safety inspection — passed.' },
    { id: 'l9', vehicleId: 'v1', date: ago(60), serviceType: 'Brake Pads', cost: 350, mileage: 62_000, notes: 'Front pads and rotors replaced.' },
    { id: 'l10', vehicleId: 'v2', date: ago(330), serviceType: 'Tire Replacement', cost: 1200, mileage: 20_000, notes: '4 new Michelin CrossClimate2.' },
    { id: 'l11', vehicleId: 'v2', date: ago(300), serviceType: 'Tire Rotation', cost: 0, mileage: 21_500, notes: 'Free rotation with tire purchase.' },
    { id: 'l12', vehicleId: 'v2', date: ago(400), serviceType: 'Inspection', cost: 35, mileage: 18_200, notes: 'Passed.' },
    { id: 'l13', vehicleId: 'v2', date: ago(175), serviceType: 'Air/Cabin Filter', cost: 35, mileage: 25_000, notes: 'DIY HEPA cabin filter replacement.' },
    { id: 'l14', vehicleId: 'v3', date: '2016-06-11', serviceType: 'Brake Pads', cost: 210, mileage: 74_300 },
    { id: 'l15', vehicleId: 'v3', date: '2018-09-02', serviceType: 'Battery Replacement', cost: 145, mileage: 95_800, notes: 'Group 51R.' },
    { id: 'l16', vehicleId: 'v3', date: '2019-04-18', serviceType: 'Tire Replacement', cost: 520, mileage: 101_200 },
    { id: 'l17', vehicleId: 'v3', date: '2020-11-05', serviceType: 'Transmission Fluid', cost: 129, mileage: 113_000 },
  ];

  return { vehicles, logs };
}
