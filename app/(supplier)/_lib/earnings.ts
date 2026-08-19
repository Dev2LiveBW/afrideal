import type { getSupplierWorkspace } from '@/lib/queries';

/**
 * Supplier earnings maths shared by the dashboard and earnings pages.
 *
 * AfriDeal settles suppliers monthly and takes a flat 12% commission on the
 * gross value they billed the platform that period (`supplier_subtotal`
 * summed across their legs) — the same rate the seeded settlements already
 * imply (commission ÷ gross ≈ 0.12 on every row in /data/settlements.json).
 */

type Workspace = Awaited<ReturnType<typeof getSupplierWorkspace>>;

export const COMMISSION_RATE = 0.12;

export function periodOf(iso: string): string {
  return iso.slice(0, 7);
}

export function currentPeriod(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function monthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', { month: 'short' });
}

/** Gross billed to AfriDeal in a period, read from legs rather than settlements. */
export function accruedGross(workspace: Workspace, period: string): number {
  return workspace.legs
    .filter((leg) => leg.status !== 'CANCELLED' && periodOf(leg.created_at) === period)
    .reduce((sum, leg) => sum + leg.supplier_subtotal, 0);
}

export interface EarningsPoint {
  label: string;
  value: number;
}

/**
 * Monthly net-earnings trend. Already-settled months use the real settlement
 * net; the current, not-yet-settled month is estimated from its legs at the
 * same 12% rate so the chart doesn't stop dead at last month.
 */
export function buildEarningsSeries(workspace: Workspace): EarningsPoint[] {
  const period = currentPeriod();
  const periods = new Set(workspace.settlements.map((settlement) => settlement.period));
  periods.add(period);

  return Array.from(periods)
    .sort()
    .map((p) => {
      const settlement = workspace.settlements.find((row) => row.period === p);
      const value = settlement ? settlement.net : accruedGross(workspace, p) * (1 - COMMISSION_RATE);
      return { label: monthLabel(p), value: Math.round(value) };
    });
}

export function mtdGross(workspace: Workspace): number {
  return Math.round(accruedGross(workspace, currentPeriod()));
}

export function mtdNet(workspace: Workspace): number {
  return Math.round(mtdGross(workspace) * (1 - COMMISSION_RATE));
}

export function lifetimeNet(workspace: Workspace): number {
  const settled = workspace.settlements.reduce((sum, settlement) => sum + settlement.net, 0);
  return Math.round(settled + mtdNet(workspace));
}
