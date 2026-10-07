import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`bg-surface border border-line rounded-md ${className}`} style={style}>
      {children}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-on-ink border border-ink hover:opacity-85',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 border border-transparent hover:bg-surface-2 hover:text-ink',
  danger: 'bg-surface text-bad border border-line-strong hover:bg-bad-soft',
  dangerSolid: 'bg-bad text-white border border-bad hover:opacity-90',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS; size?: 'sm' | 'md' }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm'
      } ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

const dialogStack: symbol[] = [];

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-surface border border-line rounded-t-lg sm:rounded-lg shadow-2xl w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} overflow-hidden flex flex-col max-h-[92vh]`}
      >
        <div className="px-5 pt-4 pb-3 border-b border-line flex justify-between items-center gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink p-1 -mr-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-overlay">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface border border-line rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-5 gap-3"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-bad" />
          <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
        </div>
        <p className="text-ink-2 text-sm">{message}</p>
        <div className="pt-3 flex justify-end gap-2">
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
      className="flex items-center gap-2.5 pl-3.5 pr-2.5 py-2.5 mb-2 text-sm rounded-md bg-ink text-on-ink shadow-xl animate-toast-in max-w-[calc(100vw-2rem)]"
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-ok" /> : <XCircle className="w-4 h-4 shrink-0 text-bad" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} aria-label="Dismiss" className="ml-2 p-1 opacity-60 hover:opacity-100 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export const inputClass =
  'w-full h-10 px-3 border border-line-strong rounded bg-surface text-ink placeholder:text-ink-3/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-bad';

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2 mb-1">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-bad text-xs mt-1">{error}</p> : hint ? <p className="text-ink-3 text-xs mt-1">{hint}</p> : null}
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
      {(id) => <textarea id={id} className={`${inputClass} h-auto py-2`} {...props} />}
    </Field>
  );
}

export function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="pt-2 flex justify-end gap-2">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}

export function SectionHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-2.5">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function Plate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-6 px-1.5 rounded-[3px] border-[1.5px] border-ink-2 font-mono text-[12px] font-medium tracking-[0.12em] text-ink uppercase leading-none">
      {children}
    </span>
  );
}

export function Odometer({ miles, size = 'md' }: { miles: number; size?: 'sm' | 'md' }) {
  const digits = String(Math.max(0, Math.round(miles))).padStart(6, '0').split('');
  const cell = size === 'md' ? 'w-[1.35rem] h-8 text-lg' : 'w-4 h-6 text-[13px]';
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${Math.round(miles).toLocaleString('en-US')} miles`} role="img">
      <span className="inline-flex gap-px p-px rounded-[3px] bg-odo-bg ring-1 ring-line-strong" aria-hidden>
        {digits.map((d, i) => (
          <span
            key={i}
            className={`${cell} inline-flex items-center justify-center font-mono font-medium text-odo-fg bg-[linear-gradient(180deg,rgb(255_255_255/0.06),transparent_45%,rgb(0_0_0/0.25))]`}
          >
            {d}
          </span>
        ))}
      </span>
      <span className="label-caps" aria-hidden>
        mi
      </span>
    </span>
  );
}
