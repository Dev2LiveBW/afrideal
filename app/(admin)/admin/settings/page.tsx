import { ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { getNotifications } from '@/lib/queries';

import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await auth();
  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  return (
    <>
      <ConsoleTopbar
        title="Settings"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Settings' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console px-6 py-6">
        <PageHeader
          eyebrow="Operations"
          title="Platform settings"
          description="Commission, escrow and gateway configuration for the whole marketplace."
        />

        {!isSuperAdmin ? (
          <div className="panel">
            <EmptyState
              icon={<ShieldAlert size={20} strokeWidth={1.5} />}
              title="Super Admin only"
              description="Your role does not have access to platform settings."
            />
          </div>
        ) : (
          <SettingsForm
            initialCommissionRate={12}
            initialEscrowHoldDays={7}
            initialRevenueShareRate={5}
            initialGateways={[
              { id: 'dpo', label: 'DPO Pay', connected: true },
              { id: 'orange', label: 'Orange Money', connected: true },
              { id: 'paygate', label: 'PayGate', connected: true },
            ]}
            initialChannels={[
              { id: 'email', label: 'Email', enabled: true },
              { id: 'sms', label: 'SMS', enabled: true },
              { id: 'push', label: 'Push notifications', enabled: false },
              { id: 'inapp', label: 'In-app notifications', enabled: true },
            ]}
          />
        )}
      </div>
    </>
  );
}
