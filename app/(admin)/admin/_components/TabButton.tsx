'use client';

import { cn } from '@/lib/utils';

/** Shared pill-tab button for the client-side filters across /admin list pages. */
export function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-200',
        active
          ? 'bg-ink text-white'
          : 'bg-surface-raised text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04]',
      )}
    >
      {label}
    </button>
  );
}
