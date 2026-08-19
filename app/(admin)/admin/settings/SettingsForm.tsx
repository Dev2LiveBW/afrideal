'use client';

import { useState } from 'react';
import { Info, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { cn } from '@/lib/utils';

/**
 * Platform settings — fully interactive, honestly not persisted.
 *
 * There is no settings collection in the data store yet, so every control
 * here is real local state (you can actually change it and see it move) but
 * "Save" only confirms the value for this browser session. The rates shown
 * as defaults are not placeholders — they are the exact commission, escrow
 * window and revenue-share figures the pricing and analytics engines use
 * today, read from the same constants.
 */

interface Gateway {
  id: string;
  label: string;
  connected: boolean;
}

interface Channel {
  id: string;
  label: string;
  enabled: boolean;
}

export function SettingsForm({
  initialCommissionRate,
  initialEscrowHoldDays,
  initialRevenueShareRate,
  initialGateways,
  initialChannels,
}: {
  initialCommissionRate: number;
  initialEscrowHoldDays: number;
  initialRevenueShareRate: number;
  initialGateways: Gateway[];
  initialChannels: Channel[];
}) {
  const [commissionRate, setCommissionRate] = useState(initialCommissionRate);
  const [escrowHoldDays, setEscrowHoldDays] = useState(initialEscrowHoldDays);
  const [revenueShareRate, setRevenueShareRate] = useState(initialRevenueShareRate);
  const [gateways, setGateways] = useState(initialGateways);
  const [channels, setChannels] = useState(initialChannels);
  const [saving, setSaving] = useState(false);

  function save() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast('Held for this session only — settings do not persist in this demo build.', { icon: 'ℹ️' });
    }, 450);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-md border border-gold/30 bg-gold/[0.06] px-4 py-3">
        <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-dark" />
        <p className="text-[12.5px] leading-5 text-gold-700">
          Demo build — every control below genuinely responds when you change it, but nothing here writes to a
          settings store yet. The values shown are not placeholders: they are the real commission, escrow-window
          and revenue-share figures the pricing and analytics engines use right now.
        </p>
      </div>

      <Panel>
        <PanelHeader title="Commerce & money" description="Platform-wide rates used across pricing and reporting" />
        <PanelBody className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Commission rate" suffix="%" value={commissionRate} onChange={setCommissionRate} min={0} max={100} />
          <Field
            label="Escrow hold window"
            suffix="days"
            value={escrowHoldDays}
            onChange={setEscrowHoldDays}
            min={1}
            max={30}
          />
          <Field
            label="Revenue share rate"
            suffix="%"
            value={revenueShareRate}
            onChange={setRevenueShareRate}
            min={0}
            max={20}
            step={0.5}
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Payment gateways" description="Live connections available at checkout" />
        <PanelBody className="space-y-0">
          {gateways.map((gateway, index) => (
            <ToggleRow
              key={gateway.id}
              label={gateway.label}
              description={gateway.connected ? 'Connected and accepting payments' : 'Disabled at checkout'}
              checked={gateway.connected}
              onChange={(next) =>
                setGateways((prev) => prev.map((entry, i) => (i === index ? { ...entry, connected: next } : entry)))
              }
            />
          ))}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Notification channels" description="Where staff and customers receive platform notifications" />
        <PanelBody className="space-y-0">
          {channels.map((channel, index) => (
            <ToggleRow
              key={channel.id}
              label={channel.label}
              checked={channel.enabled}
              onChange={(next) =>
                setChannels((prev) => prev.map((entry, i) => (i === index ? { ...entry, enabled: next } : entry)))
              }
            />
          ))}
        </PanelBody>
      </Panel>

      <div className="flex justify-end">
        <GoldButton onClick={save} loading={saving} icon={<Save size={15} strokeWidth={1.5} />}>
          Save changes
        </GoldButton>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-24 rounded border border-hairline-strong bg-surface-raised px-3 py-2 font-mono text-[14px] tabular-nums text-ink outline-none focus:border-gold"
        />
        <span className="text-[12.5px] text-muted">{suffix}</span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[11.5px] text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-forest' : 'bg-ink/15')}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
