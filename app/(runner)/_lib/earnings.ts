import type { getRunnerWorkspace } from '@/lib/queries';

/** Shipments as `getRunnerWorkspace` decorates them (order + supplier attached). */
type DecoratedShipments = Awaited<ReturnType<typeof getRunnerWorkspace>>['completed'];

export interface EarningsPoint {
  label: string;
  value: number;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

/** Monthly payout trend built from the runner's own delivered shipments. */
export function buildRunnerEarningsSeries(completed: DecoratedShipments): EarningsPoint[] {
  const byMonth = new Map<string, number>();

  for (const shipment of completed) {
    if (!shipment.delivered_at) continue;
    const period = shipment.delivered_at.slice(0, 7);
    byMonth.set(period, (byMonth.get(period) ?? 0) + shipment.payout);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      label: MONTH_FORMATTER.format(new Date(`${period}-01T00:00:00Z`)),
      value,
    }));
}

function isSameUTCDay(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === reference.getUTCFullYear() &&
    d.getUTCMonth() === reference.getUTCMonth() &&
    d.getUTCDate() === reference.getUTCDate()
  );
}

export function todaysStats(completed: DecoratedShipments, now: Date = new Date()) {
  const today = completed.filter(
    (shipment) => shipment.delivered_at && isSameUTCDay(shipment.delivered_at, now),
  );

  return {
    earnings: today.reduce((sum, shipment) => sum + shipment.payout, 0),
    deliveries: today.length,
  };
}
