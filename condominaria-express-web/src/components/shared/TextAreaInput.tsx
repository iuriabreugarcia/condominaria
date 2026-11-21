import type { TextareaHTMLAttributes } from 'react';
import { classNames } from '../../lib/classNames';
import { FormField } from './FormField';

type TextAreaInputProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextAreaInput({
  label,
  hint,
  error,
  required,
  className,
  wrapperClassName,
  id,
  rows = 4,
  ...props
}: TextAreaInputProps) {
  const textareaId = id ?? props.name;

  return (
    <FormField
      label={label}
      htmlFor={textareaId}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        className={classNames(
          'w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          className,
        )}
        {...props}
      />
    </FormField>
  );
}
