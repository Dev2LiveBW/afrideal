import type { DefaultSession } from 'next-auth';

import type { CustomerType, Role } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatar: string;
      supplier_id: string | null;
      runner_id: string | null;
      /** §7 — decides which pricing tiers this buyer can be quoted. */
      customer_type: CustomerType;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    avatar: string;
    supplier_id?: string | null;
    runner_id?: string | null;
    customer_type?: CustomerType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    avatar: string;
    supplier_id: string | null;
    runner_id: string | null;
    customer_type: CustomerType;
  }
}
