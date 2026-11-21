import type { SelectHTMLAttributes } from 'react';
import { classNames } from '../../lib/classNames';
import { FormField } from './FormField';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function SelectInput({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  className,
  wrapperClassName,
  id,
  ...props
}: SelectInputProps) {
  const selectId = id ?? props.name;

  return (
    <FormField
      label={label}
      htmlFor={selectId}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <select
        id={selectId}
        required={required}
        className={classNames(
          'min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
