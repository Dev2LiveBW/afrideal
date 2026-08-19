'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { PricingFormula } from '@/components/brand/PricingFormula';
import type { PriceResult, PricingRule } from '@/types';

/**
 * The live pricing calculator. Doubles as the "formula at a glance" panel —
 * it opens already computed against a sample cost so the shape of the
 * formula is visible before anyone touches an input, then genuinely
 * recalculates against the real API on every category or cost change.
 */

export function PricingCalculator({
  categories,
  initialCost,
  initialCategoryId,
  initialRule,
  initialResult,
}: {
  categories: { id: string; name: string }[];
  initialCost: number;
  initialCategoryId: string;
  initialRule: PricingRule | null;
  initialResult: PriceResult | null;
}) {
  const [cost, setCost] = useState(initialCost);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [rule, setRule] = useState(initialRule);
  const [result, setResult] = useState(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    if (!categoryId) {
      setError('Choose a category first.');
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('Enter a supplier cost above zero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_cost: cost, category_id: categoryId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Could not calculate a price for that input.');

      setRule(data.rule);
      setResult(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate a price for that input.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Pricing formula"
        description="Supplier cost + markup + logistics + gateway fee, rounded up to the nearest pula"
      />
      <PanelBody className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted" htmlFor="calc-cost">
              Supplier cost (BWP)
            </label>
            <input
              id="calc-cost"
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(event) => setCost(Number(event.target.value))}
              className="w-32 rounded border border-hairline-strong bg-surface-raised px-3 py-2 font-mono text-[13px] tabular-nums text-ink outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted" htmlFor="calc-category">
              Category
            </label>
            <select
              id="calc-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-[38px] rounded border border-hairline-strong bg-surface-raised px-3 text-[13px] text-ink outline-none focus:border-gold"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <GoldButton
            size="md"
            onClick={calculate}
            loading={loading}
            icon={<Calculator size={15} strokeWidth={1.5} />}
          >
            Calculate
          </GoldButton>

          {error && <p className="text-[12.5px] text-danger-ink">{error}</p>}
        </div>

        {result ? (
          <PricingFormula
            result={result}
            markupLabel={rule ? `${rule.markup_value}${rule.markup_type === 'PERCENTAGE' ? '%' : ' BWP'} markup · ${rule.category_name}` : 'Markup'}
          />
        ) : (
          <p className="text-[12.5px] text-muted">Choose a category and supplier cost, then calculate.</p>
        )}
      </PanelBody>
    </Panel>
  );
}
