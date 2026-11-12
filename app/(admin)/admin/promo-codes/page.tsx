import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { allAsDisplayed } from '@/lib/payments/status';
import { paidUsesOf, promoState } from '@/lib/promo.mjs';
import { getNotifications } from '@/lib/queries';

import { PromoCodesClient, type PromoRow } from './PromoCodesClient';
import { requireAdminPage } from '@/lib/admin-access';

export const dynamic = 'force-dynamic';

/** Spec 0011, AC-20 and AC-28. Finance and super admin, by the layout and the middleware. */
export default async function AdminPromoCodesPage() {
  await requireAdminPage('/admin/promo-codes');

  const [session, promos, orders, payments] = await Promise.all([
    auth(),
    readAll('promo-codes'),
    readAll('orders'),
    readAll('payments'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const displayed = allAsDisplayed(orders, payments);
  const now = new Date().toISOString();

  const rows: PromoRow[] = promos
    .map((promo) => {
      const paidUses = paidUsesOf(displayed, promo.code);
      return { ...promo, paid_uses: paidUses, state: promoState(promo, paidUses, now) };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <ConsoleTopbar
        title="Promo codes"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Promo codes' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Money"
          title="Promo codes"
          description="A discount comes out of our margin and never sells an order below its landed cost. Suppliers are paid the same either way."
        />

        <PromoCodesClient rows={rows} />
      </div>
    </>
  );
}
