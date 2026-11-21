import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type KeyValueItem = {
  label: string;
  value: ReactNode;
};

type KeyValueListProps = {
  items: KeyValueItem[];
  className?: string;
};

export function KeyValueList({ items, className }: KeyValueListProps) {
  return (
    <dl
      className={classNames(
        'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
        >
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </dt>

          <dd className="mt-1 min-w-0 break-words text-sm font-bold text-slate-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
