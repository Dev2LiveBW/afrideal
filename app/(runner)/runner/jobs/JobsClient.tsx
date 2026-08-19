'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass } from 'lucide-react';
import toast from 'react-hot-toast';

import { EmptyState } from '@/components/brand/Panel';
import { ActiveJobCard } from '../../_components/ActiveJobCard';
import { JobAlertModal } from '../../_components/JobAlertModal';
import { JobCard } from '../../_components/JobCard';
import { acceptShipment } from '../../_lib/actions';
import type { DecoratedShipment } from '../../_lib/types';

/**
 * Orchestrates the jobs page: the active-job screen, the available feed, and
 * the incoming-job alert. The alert only ever fires for a job this runner
 * hasn't already seen this session (`seenIds`), and only while online — a
 * runner who has gone offline shouldn't get paged.
 */
export function JobsClient({
  active,
  available,
  online,
}: {
  active: DecoratedShipment[];
  available: DecoratedShipment[];
  online: boolean;
}) {
  const router = useRouter();
  const seenIds = useRef<Set<string>>(new Set());
  const [alertJob, setAlertJob] = useState<DecoratedShipment | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!online || alertJob) return;
    const next = available.find((job) => !seenIds.current.has(job.id));
    if (!next) return;

    // A short delay so the alert reads as "just came in" rather than an
    // instant page-load pop-up.
    const timer = setTimeout(() => setAlertJob(next), 1200);
    return () => clearTimeout(timer);
  }, [available, online, alertJob]);

  function dismissAlert() {
    if (alertJob) seenIds.current.add(alertJob.id);
    setAlertJob(null);
  }

  async function acceptFromModal() {
    if (!alertJob) return;
    setAccepting(true);
    const result = await acceptShipment(alertJob.id);
    setAccepting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Job accepted — head to ${alertJob.pickup_name}`);
    seenIds.current.add(alertJob.id);
    setAlertJob(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow">Active {active.length > 1 ? 'jobs' : 'job'}</p>
          {active.map((job) => (
            <ActiveJobCard key={job.id} job={job} variant="full" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <p className="eyebrow">Available jobs</p>
        {available.length === 0 ? (
          <EmptyState
            icon={<Compass size={20} strokeWidth={1.5} />}
            title="No jobs available right now"
            description={
              online
                ? "You're online — new jobs will alert you the moment one opens up nearby."
                : 'Go online from the dashboard to start receiving job alerts.'
            }
            className="rounded-lg border border-hairline bg-surface-raised py-12"
          />
        ) : (
          <div className="space-y-3">
            {available.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      <JobAlertModal
        job={alertJob}
        loading={accepting}
        onAccept={acceptFromModal}
        onDecline={dismissAlert}
        onExpire={() => {
          if (alertJob) toast('Job offer expired', { icon: '⏱️' });
          dismissAlert();
        }}
      />
    </div>
  );
}
