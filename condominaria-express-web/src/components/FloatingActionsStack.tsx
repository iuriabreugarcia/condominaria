import type { ReactNode } from 'react';

type FloatingActionsStackProps = {
  children: ReactNode;
};

export function FloatingActionsStack({
  children,
}: FloatingActionsStackProps) {
  return (
    <div
      className="portal-floating-actions pointer-events-none fixed right-5 z-50 flex flex-col items-end gap-3 print:hidden"
      style={{
        bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
    </div>
  );
}
