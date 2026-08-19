import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { calculatePrice } from '@/lib/pricing-engine';
import { findMarginAlerts } from '@/lib/pricing-tiers';
import { getNotifications } from '@/lib/queries';

import { MarginAlertConsole } from '@/components/procurement/MarginAlertConsole';
import { PricingCalculator } from './PricingCalculator';
import { PricingRulesTable } from './PricingRulesTable';

export const dynamic = 'force-dynamic';

const SAMPLE_COST = 100;

export default async function AdminPricingPage() {
  const [session, rules, bands, offers, products, marginRules] = await Promise.all([
    auth(),
    readAll('pricing-rules'),
    readAll('customer-prices'),
    readAll('supplier-offers'),
    readAll('products'),
    readAll('margin-rules'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const canEdit = session?.user ? ['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(session.user.role) : false;

  const defaultRule = rules.find((rule) => rule.active) ?? rules[0] ?? null;
  const defaultResult = defaultRule ? calculatePrice(SAMPLE_COST, defaultRule) : null;

  // §19 — computed live from the current bands and supplier costs, so the queue
  // reflects the data an operator is actually looking at.
  const alerts = findMarginAlerts(bands, offers, products, marginRules);

  return (
    <>
      <ConsoleTopbar
        title="Pricing"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Pricing' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Money"
          title="Pricing and margin"
          description="Every price on the storefront comes from a category rule plus logistics and gateway cost, computed the same way here as it is at checkout."
        />

        <MarginAlertConsole alerts={alerts} />

        <PricingCalculator
          categories={rules.map((rule) => ({ id: rule.category_id, name: rule.category_name }))}
          initialCost={SAMPLE_COST}
          initialCategoryId={defaultRule?.category_id ?? ''}
          initialRule={defaultRule}
          initialResult={defaultResult}
        />

        <PricingRulesTable rules={rules} canEdit={canEdit} />
      </div>
    </>
  );
}
