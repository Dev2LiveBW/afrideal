import type { EscrowSummary } from '@/lib/escrow';

/**
 * Shape of `GET /api/analytics`. Mirrored here so the server-rendered initial
 * load (computed directly via `readAll`, per the admin data pattern) and the
 * client refetch on period change can never quietly drift apart.
 */

export type AnalyticsPeriod = 'MTD' | 'QTD' | 'YTD';

export interface AnalyticsExclusion {
  label: string;
  amount: number;
  why: string;
}

export interface AnalyticsData {
  period: string;
  period_gmv: number;
  lifetime_gmv: number;
  order_count: number;
  average_order_value: number;
  gross_margin: number;
  margin_pct: number;
  trend: { date: string; gmv: number; orders: number }[];
  revenue_streams: { name: string; value: number }[];
  total_revenue: number;
  apr: {
    total_revenue: number;
    exclusions: AnalyticsExclusion[];
    total_exclusions: number;
    qualifying_revenue: number;
    rate: number;
    revenue_share_due: number;
  };
  escrow: EscrowSummary;
  top_suppliers: {
    id: string;
    name: string;
    score: number;
    fulfilment: number;
    rating: number;
    gmv: number;
    orders: number;
  }[];
  settlements_pending: number;
}
