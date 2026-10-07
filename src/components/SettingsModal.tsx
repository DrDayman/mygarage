import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Database, Download, FileSpreadsheet, RotateCcw, Trash2, Upload } from 'lucide-react';
import type { MaintenanceLog, Vehicle } from '../types';
import { createBackup, parseBackup } from '../lib/storage';
import type { GarageData } from '../lib/storage';
import { downloadFile, logsToCsv } from '../lib/csv';
import { todayISO } from '../lib/format';
import { createSeedData } from '../data/seed';
import type { ToastType } from './ui';
import { Button, ConfirmModal, Modal } from './ui';

type Pending = { title: string; message: string; confirmText: string; data: GarageData; toast: string } | null;

export function SettingsModal({
  vehicles,
  logs,
  onReplaceAll,
  onClose,
  notify,
}: {
  vehicles: Vehicle[];
  logs: MaintenanceLog[];
  onReplaceAll: (data: GarageData) => void;
  onClose: () => void;
  notify: (message: string, type?: ToastType) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);

  const exportBackup = () => {
    downloadFile(`mygarage-backup-${todayISO()}.json`, JSON.stringify(createBackup({ vehicles, logs }), null, 2), 'application/json');
    notify('Backup downloaded.');
  };

  const exportCsv = () => {
    downloadFile(`mygarage-all-services-${todayISO()}.csv`, logsToCsv(logs, vehicles), 'text/csv;charset=utf-8');
    notify('CSV exported.');
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      setPending({
        title: 'Restore Backup',
        message: `Replace your current garage with ${data.vehicles.length} vehicle(s) and ${data.logs.length} service record(s) from "${file.name}"?`,
        confirmText: 'Restore',
        data,
        toast: 'Backup restored.',
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not read that file.', 'error');
    }
  };

  const rows = [
    {
      icon: Download,
      title: 'Download backup',
      body: 'Everything is stored in this browser. Save a JSON backup to move it to another device.',
      action: <Button size="sm" variant="secondary" onClick={exportBackup}>Download</Button>,
    },
    {
      icon: Upload,
      title: 'Restore from backup',
      body: 'Load a previously downloaded backup file. This replaces the current data.',
      action: (
        <>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
          <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>Choose file</Button>
        </>
      ),
    },
    {
      icon: FileSpreadsheet,
      title: 'Export all services (CSV)',
      body: 'One spreadsheet with every service record across all vehicles.',
      action: <Button size="sm" variant="secondary" onClick={exportCsv} disabled={logs.length === 0}>Export</Button>,
    },
    {
      icon: RotateCcw,
      title: 'Load demo data',
      body: 'Replace everything with the sample garage.',
      action: (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setPending({ title: 'Load Demo Data', message: 'Replace your current garage with the sample vehicles?', confirmText: 'Load demo', data: createSeedData(), toast: 'Demo data loaded.' })
          }
        >
          Load
        </Button>
      ),
    },
    {
      icon: Trash2,
      title: 'Erase all data',
      body: 'Start from an empty garage.',
      action: (
        <Button
          size="sm"
          variant="danger"
          onClick={() =>
            setPending({ title: 'Erase All Data', message: 'Delete every vehicle and service record? Download a backup first if you might want them.', confirmText: 'Erase', data: { vehicles: [], logs: [] }, toast: 'All data erased.' })
          }
        >
          Erase
        </Button>
      ),
    },
  ];

  return (
    <Modal title="Data & settings" onClose={onClose} wide>
      <div className="flex items-center gap-2 text-sm text-ink-3 mb-1">
        <Database className="w-4 h-4" /> {vehicles.length} vehicles · {logs.length} service records
      </div>
      <ul className="divide-y divide-line">
        {rows.map(({ icon: Icon, title, body, action }) => (
          <li key={title} className="py-3.5 flex items-start gap-3">
            <Icon className="w-4 h-4 text-ink-3 mt-1 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-ink text-sm">{title}</p>
              <p className="text-xs text-ink-3 mt-0.5">{body}</p>
            </div>
            <div className="shrink-0">{action}</div>
          </li>
        ))}
      </ul>

      {pending && (
        <ConfirmModal
          title={pending.title}
          message={pending.message}
          confirmText={pending.confirmText}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onReplaceAll(pending.data);
            notify(pending.toast);
            setPending(null);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
