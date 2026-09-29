import type { CustomerType, Role } from '@/types';

/**
 * What AfriDeal stores on a Clerk user's `publicMetadata`, and therefore what
 * arrives in the session token once the Clerk dashboard is set to include
 * `{"metadata": "{{user.public_metadata}}"}` (Sessions → Customize session
 * token). `scripts/sync-users-to-clerk.mjs` writes these; nothing else should.
 */
export interface AfriDealMetadata {
  role?: Role;
  supplier_id?: string | null;
  runner_id?: string | null;
  /** §7 - decides which pricing tiers this buyer can be quoted. */
  customer_type?: CustomerType;
  /** The JSON-store profile row this account maps to, once known. */
  user_id?: string;
}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: AfriDealMetadata;
  }

  interface UserPublicMetadata extends AfriDealMetadata {}
}
