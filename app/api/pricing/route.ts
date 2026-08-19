import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { readAll, update } from '@/lib/db';
import { audit } from '@/lib/notifications';
import { calculatePrice, getPricingRule } from '@/lib/pricing-engine';

export const dynamic = 'force-dynamic';

/** GET /api/pricing — every rule. */
export const GET = handled(async () => ok(await readAll('pricing-rules')));

const CalcSchema = z.object({
  supplier_cost: z.number().positive('Enter a supplier cost above zero.'),
  category_id: z.string(),
});

/** POST /api/pricing — the live calculator on /admin/pricing. */
export const POST = handled(async (request: Request) => {
  const parsed = CalcSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.', 422);

  const rules = await readAll('pricing-rules');
  const rule = getPricingRule(rules, parsed.data.category_id);
  if (!rule) return fail('No active pricing rule for that category.', 404);

  return ok({ rule, result: calculatePrice(parsed.data.supplier_cost, rule) });
});

const RuleSchema = z.object({
  id: z.string(),
  markup_type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  markup_value: z.number().min(0).max(500).optional(),
  logistics_cost: z.number().min(0).max(1000).optional(),
  gateway_rate: z.number().min(0).max(0.2).optional(),
  active: z.boolean().optional(),
});

/** PATCH /api/pricing — edit a category rule inline. */
export const PATCH = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const parsed = RuleSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid rule.', 422);

  const { id, ...patch } = parsed.data;
  const before = (await readAll('pricing-rules')).find((rule) => rule.id === id);
  if (!before) return fail('Pricing rule not found.', 404);

  const updated = await update('pricing-rules', id, patch);

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'PRICING_RULE_UPDATED',
    entity: 'pricing-rule',
    entityId: id,
    detail: `${before.category_name} markup ${before.markup_value}% → ${patch.markup_value ?? before.markup_value}%.`,
  });

  return ok(updated);
});
