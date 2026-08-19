import Link from 'next/link';
import { Compass, PackageCheck, ShieldAlert, Wallet } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { auth } from '@/lib/auth';
import { getRunnerWorkspace } from '@/lib/queries';
import { ActiveJobCard } from '../../_components/ActiveJobCard';
import { JobCard } from '../../_components/JobCard';
import { OnlineToggle } from '../../_components/OnlineToggle';
import { todaysStats } from '../../_lib/earnings';

export const dynamic = 'force-dynamic';

export default async function RunnerDashboardPage() {
  const session = await auth();
  const runnerId = session?.user.runner_id ?? null;
  const workspace = runnerId ? await getRunnerWorkspace(runnerId) : null;

  if (!workspace?.runner) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No runner profile linked"
        description="This account isn't linked to a runner record, so there's nothing to show here."
      />
    );
  }

  const { runner, active, available, completed } = workspace;
  const today = todaysStats(completed);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Runner Portal"
        title={`Hey, ${runner.name.split(' ')[0]}`}
        description="Here's your day so far."
      />

      <OnlineToggle runnerId={runner.id} initialOnline={runner.online} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Today's earnings"
          value={today.earnings}
          format="money"
          accent="gold"
          icon={<Wallet size={16} strokeWidth={1.5} />}
        />
        <StatCard
          label="Today's deliveries"
          value={today.deliveries}
          accent="forest"
          icon={<PackageCheck size={16} strokeWidth={1.5} />}
        />
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow">Active {active.length > 1 ? 'jobs' : 'job'}</p>
          {active.map((job) => (
            <ActiveJobCard key={job.id} job={job} variant="compact" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Available jobs</p>
          {available.length > 0 && (
            <Link href="/runner/jobs" className="text-[12px] font-medium text-forest">
              See all
            </Link>
          )}
        </div>

        {available.length === 0 ? (
          <EmptyState
            icon={<Compass size={20} strokeWidth={1.5} />}
            title="No jobs available right now"
            description="New jobs appear here the moment an order is ready for collection nearby. Stay online to get notified instantly."
            className="rounded-lg border border-hairline bg-surface-raised py-10"
          />
        ) : (
          <div className="space-y-3">
            {available.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
