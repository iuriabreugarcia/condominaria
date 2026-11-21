import type { InputHTMLAttributes } from 'react';
import { classNames } from '../../lib/classNames';
import { FormField } from './FormField';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextInput({
  label,
  hint,
  error,
  required,
  className,
  wrapperClassName,
  id,
  ...props
}: TextInputProps) {
  const inputId = id ?? props.name;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <input
        id={inputId}
        required={required}
        className={classNames(
          'min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          className,
        )}
        {...props}
      />
    </FormField>
  );
}
