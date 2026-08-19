import { ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { getRunnerWorkspace } from '@/lib/queries';
import { JobsClient } from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function RunnerJobsPage() {
  const session = await auth();
  const runnerId = session?.user.runner_id ?? null;
  const workspace = runnerId ? await getRunnerWorkspace(runnerId) : null;

  if (!workspace?.runner) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No runner profile linked"
        description="This account isn't linked to a runner record, so there are no jobs to show."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Runner Portal"
        title="Jobs"
        description="Accept a job, then work it through pickup to delivery."
      />

      <JobsClient active={workspace.active} available={workspace.available} online={workspace.runner.online} />
    </div>
  );
}
