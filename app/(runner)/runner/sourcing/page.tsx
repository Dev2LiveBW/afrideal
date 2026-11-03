import { ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { DEFAULT_DELIVERY_COUNTRY } from '@/lib/lanes.mjs';
import { servesPlace } from '@/lib/runner-match';

import { SourcingClient } from './SourcingClient';

export const dynamic = 'force-dynamic';

export default async function RunnerSourcingPage() {
  const session = await auth();
  const runnerId = session?.user.runner_id ?? null;

  if (!runnerId) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No runner profile linked"
        description="This account isn't linked to a runner record, so there is nothing to source."
      />
    );
  }

  const [requests, runners] = await Promise.all([readAll('runner-requests'), readAll('runners')]);
  const runner = runners.find((entry) => entry.id === runnerId);

  // Spec 0009, AC-6: the pool holds only requests in a town this runner serves.
  const pool = requests
    .filter(
      (request) =>
        request.status === 'REQUESTED' &&
        !!runner &&
        servesPlace(runner, request.delivery_country ?? DEFAULT_DELIVERY_COUNTRY, request.delivery_city),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const mine = requests
    .filter((request) => request.runner_id === runnerId && request.status !== 'CANCELLED')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Runner Portal"
        title="Sourcing"
        description="Requests for things the catalogue does not carry. Take one, find it, and send back the price."
      />

      <SourcingClient pool={pool} mine={mine} />
    </div>
  );
}
