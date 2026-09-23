'use client';

import { useClerk, useUser } from '@clerk/nextjs';

import type { AfriDealMetadata } from '@/types/clerk';
import type { Role } from '@/types';

/**
 * The signed-in user as client components see it.
 *
 * Shaped like the old NextAuth `useSession()` result on purpose - `data.user`
 * with `name`, `avatar` and `role`, plus a `status` - so the nav bars and the
 * home-page nudge kept their code. The role comes from Clerk's public metadata,
 * which the sync script writes; a fresh sign-up has none and reads as a
 * customer, which is what they are.
 */

export interface ClientSessionUser {
  name: string;
  email: string;
  avatar: string;
  role: Role;
}

export interface ClientSession {
  user: ClientSessionUser;
}

type Status = 'loading' | 'authenticated' | 'unauthenticated';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function useSession(): { data: ClientSession | null; status: Status } {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return { data: null, status: 'loading' };
  if (!isSignedIn || !user) return { data: null, status: 'unauthenticated' };

  const metadata = (user.publicMetadata ?? {}) as AfriDealMetadata;
  const email = user.primaryEmailAddress?.emailAddress ?? '';
  const name = user.fullName?.trim() || email.split('@')[0] || 'Account';

  return {
    status: 'authenticated',
    data: {
      user: {
        name,
        email,
        avatar: initials(name),
        role: metadata.role ?? 'CUSTOMER',
      },
    },
  };
}

/** Sign out and land somewhere sensible. */
export function useSignOut() {
  const { signOut } = useClerk();
  return (redirectUrl = '/') => signOut({ redirectUrl });
}
