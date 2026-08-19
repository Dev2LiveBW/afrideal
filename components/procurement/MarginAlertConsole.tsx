import { AlertTriangle, ShieldCheck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { Panel, PanelHeader } from '@/components/brand/Panel';
import { TIER_LABELS } from '@/lib/pricing-tiers';
import { cn } from '@/lib/utils';
import type { MarginAlert } from '@/types';

/**
 * Minimum margin protection (§19).
 *
 * Alerts are computed from live bands against the most expensive supplier the
 * engine might actually route to, so this is a worst-case view rather than an
 * average one.
 *
 * Nothing here reprices anything. §19 is explicit that a supplier cost rise
 * must not silently move a customer-facing price; an operator reviews the
 * shortfall and decides. The controls raise a decision, they do not take one.
 */
export function MarginAlertConsole({ alerts }: { alerts: MarginAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Panel>
        <PanelHeader
          title="Margin protection"
          description="Every live band is clearing its category floor"
        />
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-wash text-forest">
            <ShieldCheck size={17} strokeWidth={1.5} />
          </span>
          <p className="text-[13.5px] text-body">
            No active price sits below its minimum margin. Alerts appear here when a supplier cost
            rise pushes a band under its floor.
          </p>
        </div>
      </Panel>
    );
  }

  const worst = alerts[0];

  return (
    <Panel>
      <PanelHeader
        title="Margin protection"
        description={`${alerts.length} live ${alerts.length === 1 ? 'band is' : 'bands are'} below floor`}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-wash px-2.5 py-1 text-[11.5px] font-medium text-danger-ink ring-1 ring-inset ring-danger/20">
            <AlertTriangle size={12} strokeWidth={1.75} />
            worst {worst.shortfall_pct.toFixed(1)} pts short
          </span>
        }
      />

      <div className="overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>Product</th>
              <th>Tier</th>
              <th>Listed price</th>
              <th>Worst-case cost</th>
              <th>Margin</th>
              <th className="text-right">Shortfall</th>
            </tr>
          </thead>

          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.customer_price_id}>
                <td className="font-medium text-ink">{alert.product_name}</td>

                <td>
                  <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-body">
                    {TIER_LABELS[alert.pricing_tier]}
                  </span>
                </td>

                <td>
                  <MoneyText amount={alert.unit_price} size="sm" />
                </td>

                <td>
                  <MoneyText amount={alert.supplier_cost} size="sm" tone="muted" />
                </td>

                <td>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.08]">
                      <span
                        className="block h-full rounded-full bg-danger"
                        style={{
                          width: `${Math.min(100, (alert.actual_margin_pct / Math.max(alert.minimum_margin_pct, 1)) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="font-mono text-[12.5px] tabular-nums text-danger-ink">
                      {alert.actual_margin_pct.toFixed(1)}%
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      / {alert.minimum_margin_pct}%
                    </span>
                  </div>
                </td>

                <td className="text-right">
                  <span
                    className={cn(
                      'font-mono text-[13px] font-medium tabular-nums',
                      alert.shortfall_pct >= 5 ? 'text-danger-ink' : 'text-gold-dark',
                    )}
                  >
                    −{alert.shortfall_pct.toFixed(1)} pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-hairline bg-surface px-5 py-3 text-[12px] leading-5 text-body">
        Margin is measured against the highest cost among the suppliers this product could be routed
        to, not the cheapest. Prices are never adjusted automatically: raise the band, renegotiate the
        supply, or accept the thinner margin deliberately.
      </p>
    </Panel>
  );
}
