import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={classNames('min-w-0 space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-bold text-slate-800"
      >
        {label}
        {required ? <span className="ml-1 text-orange-600">*</span> : null}
      </label>

      <div className="min-w-0">{children}</div>

      {error ? (
        <p className="text-xs font-bold leading-relaxed text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs font-semibold leading-relaxed text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
