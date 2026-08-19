import { Percent } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { pct } from '@/lib/format';

/**
 * The Annual Platform Report revenue-share panel.
 *
 * Shared between /admin/dashboard (fixed rolling 30 days) and /admin/analytics
 * (period toggle) so the two screens can never disagree about how the 5%
 * liability is derived. Every exclusion is itemised with its reason rather
 * than folded into one adjustment, because "trust me" is not an answer this
 * number gets to give in front of a finance team.
 */

export interface AprExclusion {
  label: string;
  amount: number;
  why: string;
}

export function AprReportPanel({
  totalRevenue,
  exclusions,
  qualifyingRevenue,
  rate,
  revenueShareDue,
  periodLabel,
  className,
}: {
  totalRevenue: number;
  exclusions: AprExclusion[];
  qualifyingRevenue: number;
  rate: number;
  revenueShareDue: number;
  periodLabel: string;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Annual Platform Report — revenue share"
        description={`${periodLabel} · computed transparently, line by line`}
      />
      <PanelBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <p className="text-[13px] font-medium text-ink">Total platform revenue</p>
              <MoneyText amount={totalRevenue} size="md" />
            </div>

            <ul className="divide-y divide-hairline">
              {exclusions.map((exclusion) => (
                <li key={exclusion.label} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-body">− {exclusion.label}</p>
                    <p className="mt-0.5 text-[11.5px] leading-4 text-muted">{exclusion.why}</p>
                  </div>
                  <MoneyText amount={exclusion.amount} size="sm" tone="danger" className="shrink-0" />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t-2 border-hairline-strong pt-3">
              <p className="text-[13px] font-semibold text-ink">Qualifying revenue</p>
              <MoneyText amount={qualifyingRevenue} size="md" tone="forest" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-md bg-gradient-to-br from-gold-50 to-gold-50/30 p-5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
              <Percent size={17} strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-[12px] text-gold-700">
              Qualifying revenue × <span className="font-mono">{pct(rate * 100, 0)}</span>
            </p>
            <MoneyText amount={revenueShareDue} size="xl" tone="gold" className="mt-1" />
            <p className="mt-1 text-[11px] text-muted">Revenue share liability</p>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
