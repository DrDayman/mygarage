import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`} style={style}>
      {children}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-500',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500',
  dangerSolid: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
} as const;

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/** Open dialogs, innermost last — only the top one reacts to Escape. */
const dialogStack: symbol[] = [];

/** Closes on Escape, focuses the first field and locks page scroll while open. */
function useDialogBehavior(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const token = Symbol('dialog');
    dialogStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialogStack[dialogStack.length - 1] === token) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input:not([type=hidden]):not(.hidden), select, textarea, button[data-autofocus]')?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      dialogStack.splice(dialogStack.indexOf(token), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return ref;
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useDialogBehavior(onClose);
  const titleId = useId();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 id={titleId} className="text-lg font-bold text-slate-800">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
}: {
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}) {
  const ref = useDialogBehavior(onCancel);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-4"
      >
        <div className="flex items-center space-x-3 text-red-600">
          <AlertTriangle className="w-6 h-6" />
          <h2 id={titleId} className="text-lg font-bold text-slate-800">
            {title}
          </h2>
        </div>
        <p className="text-slate-600 text-sm">{message}</p>
        <div className="pt-4 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button variant="dangerSolid" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type ToastType = 'success' | 'error';

export function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  return (
    <div
      role="status"
      className={`flex items-center p-4 mb-3 text-sm rounded-lg shadow-lg animate-toast-in ${
        type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" /> : <XCircle className="w-5 h-5 mr-2 text-red-500" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} aria-label="Dismiss" className="ml-auto pl-3 text-slate-400 hover:text-slate-600 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Form fields ---

export const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400';

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-red-600 text-xs mt-1">{error}</p> : hint ? <p className="text-slate-500 text-xs mt-1">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <input id={id} aria-invalid={error ? true : undefined} className={inputClass} {...props} />}
    </Field>
  );
}

export function SelectInput({ label, options, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: readonly string[] }) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <select id={id} className={inputClass} {...props}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextArea({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => <textarea id={id} className={inputClass} {...props} />}
    </Field>
  );
}

export function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="pt-4 flex justify-end space-x-3">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
