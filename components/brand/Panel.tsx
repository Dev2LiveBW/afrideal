import { cn } from '@/lib/utils';

/** Console surface primitives — the repeating chrome of every admin screen. */

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn('panel overflow-hidden', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('panel-header', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 truncate text-[13px] text-body">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

/**
 * The nested enclosure from DESIGN.md — outer tray, inner core, concentric
 * radii. Reserved for surfaces that carry weight, never for repeating rows.
 */
export function Enclosure({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('enclosure', className)}>
      <div className={cn('enclosure-core', innerClassName)}>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunk text-muted">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="measure mt-1.5 text-[13px] text-body">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-headline-md font-semibold text-ink">{title}</h1>
        {description && <p className="measure mt-1.5 text-[14px] text-body">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
