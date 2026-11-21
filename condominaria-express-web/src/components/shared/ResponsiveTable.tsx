import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type ResponsiveTableProps = {
  children: ReactNode;
  className?: string;
};

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div
      className={classNames(
        'min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  );
}
