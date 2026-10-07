import { useCallback, useEffect, useState } from 'react';
import type { MaintenanceLog, NewLog, NewVehicle, Vehicle } from '../types';
import { createSeedData } from '../data/seed';
import { newId } from '../lib/format';
import { STORAGE_KEYS, loadList, parseLog, parseVehicle, saveList } from '../lib/storage';
import type { GarageData } from '../lib/storage';

function bumpMileage(vehicles: Vehicle[], vehicleId: string, mileage: number): Vehicle[] {
  return vehicles.map((v) => (v.id === vehicleId && mileage > v.currentMileage ? { ...v, currentMileage: mileage } : v));
}

export function useGarage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadList(STORAGE_KEYS.vehicles, parseVehicle, () => createSeedData().vehicles),
  );
  const [logs, setLogs] = useState<MaintenanceLog[]>(() =>
    loadList(STORAGE_KEYS.logs, parseLog, () => createSeedData().logs),
  );

  useEffect(() => saveList(STORAGE_KEYS.vehicles, vehicles), [vehicles]);
  useEffect(() => saveList(STORAGE_KEYS.logs, logs), [logs]);

  const addVehicle = useCallback((data: NewVehicle): Vehicle => {
    const vehicle = { ...data, id: newId('v') };
    setVehicles((prev) => [...prev, vehicle]);
    return vehicle;
  }, []);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? vehicle : v)));
  }, []);

  const deleteVehicle = useCallback((vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    setLogs((prev) => prev.filter((l) => l.vehicleId !== vehicleId));
  }, []);

  const setMileage = useCallback((vehicleId: string, mileage: number) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, currentMileage: mileage } : v)));
  }, []);

  const addLog = useCallback((data: NewLog) => {
    setLogs((prev) => [...prev, { ...data, id: newId('l') }]);
    setVehicles((prev) => bumpMileage(prev, data.vehicleId, data.mileage));
  }, []);

  const updateLog = useCallback((log: MaintenanceLog) => {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)));
    setVehicles((prev) => bumpMileage(prev, log.vehicleId, log.mileage));
  }, []);

  const deleteLog = useCallback((logId: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }, []);

  const replaceAll = useCallback((data: GarageData) => {
    setVehicles(data.vehicles);
    setLogs(data.logs);
  }, []);

  return { vehicles, logs, addVehicle, updateVehicle, deleteVehicle, setMileage, addLog, updateLog, deleteLog, replaceAll };
}
