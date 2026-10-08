/**
 * Bring orders written under the old checkout into the spec 0003 model.
 *
 *   node scripts/backfill-payments.mjs            # dry run: prints the plan, writes nothing
 *   node scripts/backfill-payments.mjs --apply    # does it, in one transaction
 *
 * Run `npm run db:migrate` first: this needs the `payments` and `settings`
 * tables. Point it at a Neon branch before production (set DATABASE_URL in the
 * environment; `.env.local` never overrides a variable that is already set).
 *
 * The split is not uniform, and that is the point of the spec's migration plan
 * (docs/specs/0003-order-payment-states.md, phase 2):
 *
 * - An order at PROCESSING or beyond was paid under the old model. It gets one
 *   CONFIRMED payment, marked as a backfill, and its deadline.
 * - An order at PENDING was never paid. It becomes AWAITING_PAYMENT with a
 *   deadline already in the past (so it reads as expired), gets no payment, and
 *   loses the supplier orders and payables the old checkout raised for it: no
 *   supplier may hold a request, and no payable may exist, for unpaid goods.
 * - A CANCELLED order gets `cancel_reason: 'STAFF'` and no payment. If it was
 *   cancelled before it was ever paid, its supplier orders and payables go too.
 *
 * Stamping every order CONFIRMED would record money that never arrived, in a
 * ledger the Data Protection Act applies to.
 *
 * Idempotent: an order that already has `payment_expires_at` is left alone, and
 * an order that already has a payment gets no second one. A second run plans
 * nothing.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';
import { Pool } from '@neondatabase/serverless';

import { allowSlowHandshakes } from '../lib/postgres/network.mjs';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'afrideal';
const apply = process.argv.includes('--apply');

nextEnv.loadEnvConfig(ROOT_DIR);
allowSlowHandshakes();

const PAID = new Set(['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED']);
const WINDOW_MS = { EFT: 7 * 24 * 60 * 60 * 1000 };
const CARD_WINDOW_MS = 30 * 60 * 1000;

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: url });
const client = await pool.connect();

const rows = async (table) =>
  (await client.query(`SELECT id, data FROM "${SCHEMA}"."${table}" ORDER BY seq`)).rows.map((row) => row.data);

try {
  console.log(`backfill: ${apply ? 'APPLYING to' : 'dry run against'} ${new URL(url).host}`);

  const tables = new Set(
    (
      await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
        [SCHEMA],
      )
    ).rows.map((row) => row.table_name),
  );
  for (const needed of ['payments', 'settings']) {
    if (!tables.has(needed)) throw new Error(`table ${SCHEMA}.${needed} is missing: run npm run db:migrate first`);
  }

  await client.query('BEGIN');
  // Nothing else may write orders, payments or legs while the plan is made and applied.
  await client.query(
    `LOCK TABLE "${SCHEMA}"."orders", "${SCHEMA}"."payments", "${SCHEMA}"."supplier_orders", "${SCHEMA}"."supplier_payables", "${SCHEMA}"."settings" IN EXCLUSIVE MODE`,
  );

  const [orders, payments, legs, payables, shipments, settings] = await Promise.all([
    rows('orders'),
    rows('payments'),
    rows('supplier_orders'),
    rows('supplier_payables'),
    rows('shipments'),
    rows('settings'),
  ]);

  const before = countBy(orders, (order) => order.status);
  let paymentSeq = Math.max(0, ...payments.map((row) => Number(row.id.replace(/^pmt/, '')) || 0));
  const hasPayment = new Set(payments.map((row) => row.order_id));

  const orderUpdates = [];
  const paymentInserts = [];
  const unpaidIds = [];

  for (const order of orders) {
    if (order.payment_expires_at) continue;

    const window = WINDOW_MS[order.payment_method] ?? CARD_WINDOW_MS;
    const next = {
      ...order,
      payment_expires_at: new Date(new Date(order.placed_at).getTime() + window).toISOString(),
      cancel_reason: null,
    };

    if (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') {
      next.status = 'AWAITING_PAYMENT';
      next.payment_reference = null;
      unpaidIds.push(order.id);
    } else if (order.status === 'CANCELLED') {
      next.cancel_reason = order.cancel_reason ?? 'STAFF';
      // Cancelled before any payment (the old checkout still raised its legs):
      // AC-2 applies, so its supplier orders and payables go as well.
      const everPaid = order.timeline?.some((entry) => entry.status === 'PAID');
      if (!everPaid) unpaidIds.push(order.id);
    } else if (PAID.has(order.status)) {
      if (!hasPayment.has(order.id)) {
        const confirmedAt = order.timeline?.find((entry) => entry.status === 'PAID')?.at ?? order.placed_at;
        paymentInserts.push({
          id: `pmt${String(++paymentSeq).padStart(3, '0')}`,
          order_id: order.id,
          provider: order.payment_method,
          provider_reference: order.payment_reference ?? `BACKFILL-${order.id}`,
          status: 'CONFIRMED',
          amount: order.total,
          amount_matches: true,
          created_at: order.placed_at,
          confirmed_at: confirmedAt,
          failure_reason: null,
          note: 'Backfilled for spec 0003: paid under the checkout that marked orders paid when placed.',
        });
      }
    } else {
      throw new Error(`order ${order.id} has status ${order.status}, which this backfill does not know how to treat`);
    }

    orderUpdates.push(next);
  }

  // An unpaid order must not have a runner job either. None should exist, since
  // a job opens only when a supplier marks goods ready; stop rather than guess.
  const unpaid = new Set(unpaidIds);
  const strayJobs = shipments.filter((job) => unpaid.has(job.order_id));
  if (strayJobs.length > 0) {
    throw new Error(`unpaid orders have runner jobs (${strayJobs.map((job) => job.id).join(', ')}); resolve them by hand first`);
  }

  const legsToRemove = legs.filter((leg) => unpaid.has(leg.order_id));
  const payablesToRemove = payables.filter((entry) => unpaid.has(entry.order_id));
  const settingMissing = !settings.some((row) => row.id === 'checkout_paused');

  const after = countBy(
    orders.map((order) => orderUpdates.find((next) => next.id === order.id) ?? order),
    (order) => order.status,
  );

  console.log('backfill: orders by status before', before);
  console.log('backfill: orders by status after ', after);
  console.log(`backfill: ${orderUpdates.length} order(s) updated`);
  console.log(`backfill: ${paymentInserts.length} confirmed payment(s) to add: ${paymentInserts.map((p) => `${p.id}→${p.order_id}`).join(', ') || 'none'}`);
  console.log(`backfill: unpaid orders ${unpaidIds.join(', ') || 'none'}; removing ${legsToRemove.length} supplier order(s) [${legsToRemove.map((l) => l.id).join(', ')}] and ${payablesToRemove.length} payable(s) [${payablesToRemove.map((p) => p.id).join(', ')}]`);
  console.log(`backfill: checkout_paused setting ${settingMissing ? 'to add' : 'already present'}`);

  if (!apply) {
    await client.query('ROLLBACK');
    console.log('backfill: dry run, nothing written. Run again with --apply to write it.');
  } else {
    for (const order of orderUpdates) {
      await client.query(
        `UPDATE "${SCHEMA}"."orders" SET data = $2::jsonb, updated_at = now() WHERE id = $1`,
        [order.id, JSON.stringify(order)],
      );
    }
    for (const payment of paymentInserts) {
      await client.query(`INSERT INTO "${SCHEMA}"."payments" (id, data) VALUES ($1, $2::jsonb)`, [
        payment.id,
        JSON.stringify(payment),
      ]);
    }
    if (payablesToRemove.length > 0) {
      await client.query(`DELETE FROM "${SCHEMA}"."supplier_payables" WHERE id = ANY($1)`, [
        payablesToRemove.map((entry) => entry.id),
      ]);
    }
    if (legsToRemove.length > 0) {
      await client.query(`DELETE FROM "${SCHEMA}"."supplier_orders" WHERE id = ANY($1)`, [
        legsToRemove.map((leg) => leg.id),
      ]);
    }
    if (settingMissing) {
      await client.query(`INSERT INTO "${SCHEMA}"."settings" (id, data) VALUES ($1, $2::jsonb)`, [
        'checkout_paused',
        JSON.stringify({
          id: 'checkout_paused',
          value: { paused: false },
          updated_at: new Date().toISOString(),
          updated_by: 'System',
        }),
      ]);
    }
    await client.query('COMMIT');
    console.log('backfill: applied.');
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}

function countBy(list, key) {
  const out = {};
  for (const item of list) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}
