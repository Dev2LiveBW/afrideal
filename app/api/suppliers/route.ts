import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { insert, nextId, readAll } from '@/lib/db';
import { EVENTS, audit } from '@/lib/notifications';
import type { Supplier, VerificationDoc } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = handled(async () => ok(await readAll('suppliers')));

const CreateSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Trading name is required.'),
  legal_name: z.string().trim().optional(),
  country: z.enum(['BW', 'ZA']).default('BW'),
  city: z.string().trim().min(1, 'City is required.'),
  supplier_type: z
    .enum(['MANUFACTURER', 'WHOLESALER', 'DISTRIBUTOR', 'RETAILER', 'IMPORTER', 'BRAND', 'AGENT'])
    .default('WHOLESALER'),
  contact_email: z.string().trim().optional().default(''),
  contact_phone: z.string().trim().optional().default(''),
  registration_no: z.string().trim().optional().default(''),
  categories: z.array(z.string()).optional().default([]),
  status: z.enum(['VERIFIED', 'PENDING']).default('VERIFIED'),
});

const DEFAULT_VERIFICATION_DOCS: VerificationDoc[] = [
  { id: 'd1', label: 'Certificate of Incorporation', status: 'PENDING', uploaded_at: null },
  { id: 'd2', label: 'Tax Clearance Certificate', status: 'PENDING', uploaded_at: null },
  { id: 'd3', label: 'Proof of Bank Account', status: 'PENDING', uploaded_at: null },
  { id: 'd4', label: 'Directors ID Documents', status: 'PENDING', uploaded_at: null },
];

function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || 'SP'
  );
}

/**
 * POST /api/suppliers - lightweight launch onboarding.
 *
 * Requires only trading name, country/city, and supplier type so operations can
 * onboard launch suppliers immediately and collect KYC documents, registration
 * numbers, and portal user accounts later.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN']);
  if (response) return response;

  const parsed = CreateSupplierSchema.safeParse(await request.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue?.message ?? 'Invalid supplier details.', 422);
  }

  const data = parsed.data;
  const id = await nextId('suppliers', 's');
  const isVerified = data.status === 'VERIFIED';

  const supplier: Supplier = {
    id,
    name: data.name,
    legal_name: data.legal_name && data.legal_name.length > 0 ? data.legal_name : data.name,
    initials: initialsFrom(data.name),
    country: data.country,
    city: data.city,
    status: data.status,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    registration_no: data.registration_no,
    joined_at: new Date().toISOString(),
    rating: isVerified ? 4 : 0,
    fulfilment_rate: isVerified ? 85 : 0,
    reliability_score: isVerified ? 70 : 0,
    avg_fulfilment_days: isVerified ? 3 : 0,
    total_gmv: 0,
    products_count: 0,
    orders_count: 0,
    verification_docs: DEFAULT_VERIFICATION_DOCS.map((doc) => ({ ...doc })),
    categories: data.categories,
    supplier_type: data.supplier_type,
    commercial_model: 'AFRIDEAL_MANAGED',
  };

  const created = await insert('suppliers', supplier);

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.SUPPLIER_APPROVED,
    entity: 'supplier',
    entityId: created.id,
    detail: `Onboarded ${created.name} (${created.city}, ${created.country}) as ${created.status} with deferred KYC.`,
  });

  return ok(created, { status: 201 });
});

