'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { Panel, PanelHeader } from '@/components/brand/Panel';
import { cn } from '@/lib/utils';
import type { PricingRule } from '@/types';

/**
 * Category pricing rules, edited inline.
 *
 * Each row owns its own draft state, seeded from the server props once. A
 * successful save overwrites that draft with the API's own response — the
 * source of truth after a write is what the server just persisted, not
 * whatever `router.refresh()` eventually re-delivers as new props.
 */

export function PricingRulesTable({ rules, canEdit }: { rules: PricingRule[]; canEdit: boolean }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Category rules"
        description={
          canEdit
            ? 'Edit a value and save — the new rule applies to every price computed from this point on.'
            : 'Read-only for your role. Super Admin and Finance can edit these rules.'
        }
      />
      <div className="overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th className="w-[22%]">Category</th>
              <th>Markup</th>
              <th>Logistics (BWP)</th>
              <th>Gateway rate</th>
              <th>Active</th>
              {canEdit && <th className="text-right">Save</th>}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <RuleRow key={rule.id} initial={rule} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RuleRow({ initial, canEdit }: { initial: PricingRule; canEdit: boolean }) {
  const router = useRouter();
  const [rule, setRule] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);

  const dirty =
    rule.markup_type !== saved.markup_type ||
    rule.markup_value !== saved.markup_value ||
    rule.logistics_cost !== saved.logistics_cost ||
    rule.gateway_rate !== saved.gateway_rate ||
    rule.active !== saved.active;

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          markup_type: rule.markup_type,
          markup_value: rule.markup_value,
          logistics_cost: rule.logistics_cost,
          gateway_rate: rule.gateway_rate,
          active: rule.active,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Could not save this rule.');

      setRule(data);
      setSaved(data);
      toast.success(`${data.category_name} pricing rule updated`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this rule.');
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <tr>
        <td className="font-medium text-ink">{rule.category_name}</td>
        <td className="font-mono text-[12.5px] tabular-nums text-ink">
          {rule.markup_value}
          {rule.markup_type === 'PERCENTAGE' ? '%' : ' BWP'}
        </td>
        <td className="font-mono text-[12.5px] tabular-nums text-ink">{rule.logistics_cost.toFixed(2)}</td>
        <td className="font-mono text-[12.5px] tabular-nums text-ink">{(rule.gateway_rate * 100).toFixed(1)}%</td>
        <td>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              rule.active ? 'bg-forest-wash text-forest-ink' : 'bg-inert-wash text-inert-ink',
            )}
          >
            {rule.active ? 'Active' : 'Inactive'}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn(dirty && 'bg-gold/[0.04]')}>
      <td className="font-medium text-ink">{rule.category_name}</td>
      <td>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={500}
            step="1"
            value={rule.markup_value}
            onChange={(event) => setRule({ ...rule, markup_value: Number(event.target.value) })}
            className="w-16 rounded border border-hairline-strong bg-surface-raised px-2 py-1 font-mono text-[12.5px] tabular-nums text-ink outline-none focus:border-gold"
          />
          <select
            value={rule.markup_type}
            onChange={(event) => setRule({ ...rule, markup_type: event.target.value as PricingRule['markup_type'] })}
            className="rounded border border-hairline-strong bg-surface-raised px-1.5 py-1 text-[12px] text-ink outline-none focus:border-gold"
          >
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">BWP</option>
          </select>
        </div>
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={1000}
          step="1"
          value={rule.logistics_cost}
          onChange={(event) => setRule({ ...rule, logistics_cost: Number(event.target.value) })}
          className="w-20 rounded border border-hairline-strong bg-surface-raised px-2 py-1 font-mono text-[12.5px] tabular-nums text-ink outline-none focus:border-gold"
        />
      </td>
      <td>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={20}
            step="0.1"
            value={Number((rule.gateway_rate * 100).toFixed(2))}
            onChange={(event) => setRule({ ...rule, gateway_rate: Number(event.target.value) / 100 })}
            className="w-16 rounded border border-hairline-strong bg-surface-raised px-2 py-1 font-mono text-[12.5px] tabular-nums text-ink outline-none focus:border-gold"
          />
          <span className="text-[12px] text-muted">%</span>
        </div>
      </td>
      <td>
        <button
          type="button"
          onClick={() => setRule({ ...rule, active: !rule.active })}
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
            rule.active ? 'bg-forest-wash text-forest-ink' : 'bg-inert-wash text-inert-ink',
          )}
        >
          {rule.active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="text-right">
        <GoldButton
          size="sm"
          variant={dirty ? 'gold' : 'ghost'}
          disabled={!dirty}
          loading={saving}
          icon={<Save size={13} strokeWidth={1.5} />}
          onClick={save}
        >
          Save
        </GoldButton>
      </td>
    </tr>
  );
}
