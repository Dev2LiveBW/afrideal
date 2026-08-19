/**
 * End-to-end verification against a running dev server.
 *
 *   npm run dev          # in one terminal
 *   npm run verify       # in another
 *
 * This drives the real HTTP API, so it exercises the actual pricing engine,
 * selection engine and escrow state machine rather than a copy of their rules.
 * Anything it asserts is a claim that has been checked, not assumed.
 */

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:3000';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

// ── Minimal cookie jar ───────────────────────────────────────────────────────

function makeJar() {
  const jar = new Map();

  return {
    header: () =>
      [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
    absorb(response) {
      const raw = response.headers.getSetCookie?.() ?? [];
      for (const cookie of raw) {
        const [pair] = cookie.split(';');
        const index = pair.indexOf('=');
        if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
      }
    },
  };
}

async function request(jar, path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { cookie: jar.header(), ...(init.headers ?? {}) },
  });
  jar.absorb(response);
  return response;
}

/** Full NextAuth credentials sign-in: csrf → callback → session. */
async function signIn(email, password) {
  const jar = makeJar();

  const csrfResponse = await request(jar, '/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();

  await request(jar, '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }).toString(),
  });

  const sessionResponse = await request(jar, '/api/auth/session');
  const session = await sessionResponse.json();

  return { jar, session: session?.user ? session : null };
}

async function json(jar, path, init) {
  const response = await request(jar, path, init);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

// ── 1. Every seeded login works and carries the right role ───────────────────

const ACCOUNTS = [
  ['admin@afrideal.co.bw', 'Admin@2026', 'SUPER_ADMIN'],
  ['ops@afrideal.co.bw', 'Ops@2026', 'OPERATIONS_ADMIN'],
  ['finance@afrideal.co.bw', 'Finance@2026', 'FINANCE_ADMIN'],
  ['supplier@naledi.co.bw', 'Supplier@2026', 'SUPPLIER_OWNER'],
  ['supplier@glowup.co.za', 'Supplier@2026', 'SUPPLIER_OWNER'],
  ['runner@afrideal.co.bw', 'Runner@2026', 'RUNNER'],
  ['thabo@gmail.com', 'Customer@2026', 'CUSTOMER'],
  ['kefilwe@gmail.com', 'Customer@2026', 'CUSTOMER'],
];

section('1. Authentication — all 8 seeded users');

const sessions = {};
for (const [email, password, expectedRole] of ACCOUNTS) {
  const { jar, session } = await signIn(email, password);
  sessions[email] = { jar, session };
  check(
    `${email} → ${expectedRole}`,
    session?.user?.role === expectedRole,
    session ? `got ${session.user?.role}` : 'no session',
  );
}

section('2. Bad credentials are rejected');
{
  const { session } = await signIn('admin@afrideal.co.bw', 'wrong-password');
  check('wrong password yields no session', session === null);
  const missing = await signIn('nobody@example.com', 'whatever');
  check('unknown email yields no session', missing.session === null);
}

// ── 3. Pricing engine ────────────────────────────────────────────────────────

section('3. Pricing engine — margins are arithmetically correct');
{
  const { jar } = sessions['admin@afrideal.co.bw'];

  // Hair & Beauty is an 80% markup, BWP 15 logistics, 2.5% gateway.
  const { body } = await json(jar, '/api/pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplier_cost: 100, category_id: 'c1' }),
  });

  const r = body?.result;
  check('returns a result', r != null);

  if (r) {
    check('markup is 80% of cost', r.markup === 80, `got ${r.markup}`);
    check('logistics is 15', r.logistics_cost === 15, `got ${r.logistics_cost}`);
    check('gateway is 2.5% of cost', r.gateway_cost === 2.5, `got ${r.gateway_cost}`);
    check(
      'price = ceil(100 + 80 + 15 + 2.5) = 198',
      r.recommended_price === 198,
      `got ${r.recommended_price}`,
    );
    check(
      'margin_pct is margin over selling price',
      Math.abs(r.margin_pct - (80 / 198) * 100) < 0.001,
      `got ${r.margin_pct}`,
    );
  }

  const bad = await json(jar, '/api/pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplier_cost: -5, category_id: 'c1' }),
  });
  check('rejects a negative supplier cost', bad.status === 422, `got ${bad.status}`);
}

// ── 4. Every product sells above its highest supplier cost ───────────────────

section('4. Catalogue — no product sells below cost');
{
  const { jar } = sessions['admin@afrideal.co.bw'];
  const products = (await json(jar, '/api/products')).body ?? [];
  const offers = (await json(jar, '/api/supplier-offers')).body ?? [];

  check('12 products seeded', products.length === 12, `got ${products.length}`);

  let violations = 0;
  for (const product of products) {
    const costs = offers.filter((o) => o.product_id === product.id).map((o) => o.supplier_cost);
    if (costs.length === 0) continue;
    if (product.price <= Math.max(...costs)) violations += 1;
  }
  check('every price exceeds its highest supplier cost', violations === 0, `${violations} violation(s)`);
}

// ── 5. Selection engine ranks on composite score, not price ──────────────────

section('5. Selection engine — composite score, not cheapest');
{
  const { jar } = sessions['admin@afrideal.co.bw'];
  const { body } = await json(jar, '/api/products/p001');
  const ranked = body?.selection?.all ?? [];

  check('p001 ranks its offers', ranked.length >= 2, `got ${ranked.length}`);

  if (ranked.length >= 2) {
    const descending = ranked.every((entry, i) => i === 0 || ranked[i - 1].score >= entry.score);
    check('offers are sorted by score descending', descending);
    check('top offer is labelled PRIMARY', ranked[0].label === 'PRIMARY', ranked[0].label);
    check('second offer is labelled BACKUP 1', ranked[1].label === 'BACKUP 1', ranked[1].label);
    check('primary carries a stated reason', typeof ranked[0].reason === 'string' && ranked[0].reason.length > 20);

    // p001: Naledi is 82/unit, GlowUp is 76/unit. The cheaper offer should NOT
    // win, because Naledi scores higher on reliability, speed and stock.
    const cheapest = [...ranked].sort((a, b) => a.offer.supplier_cost - b.offer.supplier_cost)[0];
    check(
      'cheapest offer is not automatically primary',
      ranked[0].offer.id !== cheapest.offer.id,
      'the engine picked the cheapest, which defeats its purpose',
    );

    const suspended = ranked.filter((e) => e.supplier.status !== 'VERIFIED');
    check('unverified suppliers are excluded from routing', suspended.length === 0);
  }
}

// ── 6. Escrow state machine rejects illegal moves ────────────────────────────

section('6. Escrow — the state machine holds');
{
  const { jar } = sessions['ops@afrideal.co.bw'];
  const { body } = await json(jar, '/api/escrow');
  const records = body?.records ?? [];

  check('escrow queue loads', records.length > 0, `got ${records.length}`);

  const released = records.find((r) => r.status === 'RELEASED');
  if (released) {
    const attempt = await json(jar, `/api/escrow/${released.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RELEASED', note: 'verification probe' }),
    });
    check(
      'RELEASED → RELEASED is refused with 409',
      attempt.status === 409,
      `got ${attempt.status}`,
    );
  } else {
    check('a RELEASED record exists to test against', false, 'none found');
  }

  const summary = body?.summary;
  check('summary reports held total', typeof summary?.totalHeld === 'number');
  check('summary reports average hold days', typeof summary?.avgHoldDays === 'number');
}

// ── 7. Supplier data isolation ───────────────────────────────────────────────

section('7. Supplier isolation — one supplier cannot read another');
{
  const naledi = sessions['supplier@naledi.co.bw'].jar;
  const glowup = sessions['supplier@glowup.co.za'].jar;

  const naledOrders = (await json(naledi, '/api/orders')).body ?? [];
  const glowOrders = (await json(glowup, '/api/orders')).body ?? [];

  check('Naledi sees some orders', Array.isArray(naledOrders) && naledOrders.length > 0);
  check('GlowUp sees some orders', Array.isArray(glowOrders) && glowOrders.length > 0);

  const naledIds = new Set(naledOrders.map((o) => o.id));
  const glowIds = new Set(glowOrders.map((o) => o.id));
  const overlap = [...naledIds].filter((id) => glowIds.has(id));

  // Overlap is legitimate only where an order genuinely split across both.
  let improper = 0;
  for (const id of overlap) {
    const detail = (await json(naledi, `/api/orders/${id}`)).body;
    const legs = detail?.legs ?? [];
    if (legs.some((leg) => leg.supplier_id !== 's001')) improper += 1;
  }
  check(
    'Naledi never sees a leg belonging to another supplier',
    improper === 0,
    `${improper} leaked leg(s)`,
  );

  // A supplier must not be able to touch another supplier's leg.
  const glowLeg = (await json(glowup, '/api/orders')).body?.[0];
  if (glowLeg) {
    const detail = (await json(glowup, `/api/orders/${glowLeg.id}`)).body;
    const leg = detail?.legs?.[0];
    if (leg) {
      const attempt = await json(naledi, `/api/supplier-orders/${leg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      check(
        'Naledi cannot advance a GlowUp supplier order',
        attempt.status === 403 || attempt.status === 409,
        `got ${attempt.status}`,
      );
    }
  }
}

// ── 8. Role guards on the API ────────────────────────────────────────────────

section('8. Role guards');
{
  const customer = sessions['thabo@gmail.com'].jar;
  const runner = sessions['runner@afrideal.co.bw'].jar;

  const analytics = await json(customer, '/api/analytics');
  check('customer cannot read analytics', analytics.status === 403, `got ${analytics.status}`);

  const escrowQueue = await json(customer, '/api/escrow');
  check('customer cannot read the escrow queue', escrowQueue.status === 403, `got ${escrowQueue.status}`);

  const supplierPatch = await json(runner, '/api/suppliers/s006', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'VERIFIED' }),
  });
  check('runner cannot verify a supplier', supplierPatch.status === 403, `got ${supplierPatch.status}`);

  const anon = makeJar();
  const anonOrders = await json(anon, '/api/orders');
  check('anonymous cannot list orders', anonOrders.status === 401, `got ${anonOrders.status}`);
}

// ── 9. Checkout writes a correctly split order ───────────────────────────────

section('9. Checkout — the order split engine');
{
  const { jar, session } = sessions['thabo@gmail.com'];

  const before = (await json(jar, '/api/orders')).body?.length ?? 0;

  // Two lines from different categories, which route to different suppliers.
  const created = await json(jar, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [
        { product_id: 'p001', variant_id: 'p001v1', qty: 2 },
        { product_id: 'p006', variant_id: 'p006v1', qty: 3 },
      ],
      payment_method: 'ORANGE_MONEY',
      delivery_address: 'Plot 5412, Extension 12',
      delivery_city: 'Gaborone',
    }),
  });

  check('checkout returns 201', created.status === 201, `got ${created.status}`);

  const result = created.body;
  if (result?.order) {
    check('one customer-facing order', result.order.id != null);
    check('two line items', result.items?.length === 2, `got ${result.items?.length}`);
    check(
      'split into two supplier orders',
      result.supplier_orders?.length === 2,
      `got ${result.supplier_orders?.length}`,
    );
    check(
      'one escrow record per supplier order',
      result.escrow?.length === result.supplier_orders?.length,
      `${result.escrow?.length} escrow vs ${result.supplier_orders?.length} legs`,
    );
    check('every escrow leg starts HELD', result.escrow?.every((e) => e.status === 'HELD'));

    const lineSum = result.items.reduce((s, i) => s + i.line_total, 0);
    check('subtotal equals the sum of its lines', result.order.subtotal === lineSum,
      `${result.order.subtotal} vs ${lineSum}`);
    check('total = subtotal + delivery', result.order.total === result.order.subtotal + result.order.delivery_fee);

    const escrowSum = result.escrow.reduce((s, e) => s + e.amount, 0);
    check('escrow legs sum to the order subtotal', escrowSum === lineSum, `${escrowSum} vs ${lineSum}`);

    check('emits the three documented events', result.events?.length === 3, JSON.stringify(result.events));
    check('order belongs to the buyer', result.order.customer_id === session.user.id);

    const after = (await json(jar, '/api/orders')).body?.length ?? 0;
    check('order count increased by one', after === before + 1, `${before} → ${after}`);

    // Prices must come from the catalogue, never from the client.
    const products = (await json(jar, '/api/products')).body ?? [];
    const p001 = products.find((p) => p.id === 'p001');
    const variant = p001?.variants?.find((v) => v.id === 'p001v1');
    check(
      'unit price was re-read server-side',
      result.items[0].unit_price === variant?.price,
      `${result.items[0].unit_price} vs catalogue ${variant?.price}`,
    );
  }

  const empty = await json(jar, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [],
      payment_method: 'DPO_PAY',
      delivery_address: 'x',
      delivery_city: 'Gaborone',
    }),
  });
  check('an empty cart is refused', empty.status === 422, `got ${empty.status}`);
}

// ── 10. Runner availability toggle ───────────────────────────────────────────

section('10. Runner availability');
{
  const { jar } = sessions['runner@afrideal.co.bw'];

  const off = await json(jar, '/api/runners/r001', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ online: false }),
  });
  check('runner can go offline', off.status === 200 && off.body?.online === false);

  const on = await json(jar, '/api/runners/r001', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ online: true }),
  });
  check('runner can go back online', on.status === 200 && on.body?.online === true);

  const other = await json(jar, '/api/runners/r002', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ online: false }),
  });
  check('runner cannot toggle another runner', other.status === 403, `got ${other.status}`);
}

// ── 11. Supplier approval ────────────────────────────────────────────────────

section('11. Supplier approval writes through');
{
  const { jar } = sessions['ops@afrideal.co.bw'];

  const approved = await json(jar, '/api/suppliers/s007', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'VERIFIED' }),
  });
  check('pending supplier can be approved', approved.status === 200, `got ${approved.status}`);
  check('status persisted as VERIFIED', approved.body?.status === 'VERIFIED');
  check(
    'newly verified supplier gets a baseline reliability score',
    approved.body?.reliability_score > 0,
    `got ${approved.body?.reliability_score}`,
  );

  // Put it back so the demo starts from a known state.
  await json(jar, '/api/suppliers/s007', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PENDING' }),
  });
}

// ── 12. APR revenue share ────────────────────────────────────────────────────

section('12. Analytics — APR revenue share');
{
  const { jar } = sessions['finance@afrideal.co.bw'];
  const { status, body } = await json(jar, '/api/analytics?period=MTD');

  check('finance can read analytics', status === 200, `got ${status}`);

  if (body?.apr) {
    const apr = body.apr;
    check('rate is 5%', apr.rate === 0.05, `got ${apr.rate}`);
    check('exclusions are itemised', Array.isArray(apr.exclusions) && apr.exclusions.length > 0);
    check(
      'every exclusion states why',
      apr.exclusions.every((e) => typeof e.why === 'string' && e.why.length > 10),
    );
    check(
      'total exclusions equals the sum of its parts',
      Math.abs(apr.total_exclusions - apr.exclusions.reduce((s, e) => s + e.amount, 0)) < 0.01,
    );
    check(
      'revenue share = qualifying revenue × 5%',
      Math.abs(apr.revenue_share_due - apr.qualifying_revenue * 0.05) < 0.01,
    );
    check('qualifying revenue is never negative', apr.qualifying_revenue >= 0);
    check('30-day trend has 30 points', body.trend?.length === 30, `got ${body.trend?.length}`);
    check('GMV figures are reported separately', typeof body.period_gmv === 'number' && typeof body.lifetime_gmv === 'number');
  } else {
    check('APR block present', false);
  }
}

// ── 13. Tiered pricing (§14/§15/§20) ─────────────────────────────────────────

section('13. Tiered pricing — the ladder is real, not hard-coded');
{
  const business = sessions['kefilwe@gmail.com'].jar; // BUSINESS
  const retail = sessions['thabo@gmail.com'].jar; // RETAIL

  const products = (await json(business, '/api/products')).body ?? [];
  const p001 = products.find((p) => p.id === 'p001');

  // The catalogue price must be the retail entry rung, or the storefront and
  // the pricing engine disagree about the same product.
  const order1 = await json(business, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ product_id: 'p001', variant_id: 'p001v1', qty: 1 }],
      payment_method: 'DPO_PAY',
      delivery_address: 'Plot 220, Block 6',
      delivery_city: 'Gaborone',
    }),
  });
  const unit1 = order1.body?.items?.[0]?.unit_price;
  check('qty 1 is charged the retail band', unit1 === p001?.price, `${unit1} vs ${p001?.price}`);

  // Bulk band, 5–19.
  const order5 = await json(business, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ product_id: 'p001', variant_id: 'p001v1', qty: 5 }],
      payment_method: 'DPO_PAY',
      delivery_address: 'Plot 220, Block 6',
      delivery_city: 'Gaborone',
    }),
  });
  const unit5 = order5.body?.items?.[0]?.unit_price;
  check('qty 5 drops to the bulk band', unit5 < unit1, `${unit5} vs ${unit1}`);
  check('bulk line total uses the bulk unit price', order5.body?.items?.[0]?.line_total === unit5 * 5);

  // Wholesale band, 20–49. Business accounts reach this; retail ones do not.
  const order20 = await json(business, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ product_id: 'p001', variant_id: 'p001v1', qty: 20 }],
      payment_method: 'DPO_PAY',
      delivery_address: 'Plot 220, Block 6',
      delivery_city: 'Gaborone',
    }),
  });
  const unit20 = order20.body?.items?.[0]?.unit_price;
  check('qty 20 drops again to wholesale', unit20 < unit5, `${unit20} vs ${unit5}`);

  // §7 — a retail account must NOT get the wholesale rung at the same quantity.
  const retail20 = await json(retail, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ product_id: 'p001', variant_id: 'p001v1', qty: 20 }],
      payment_method: 'DPO_PAY',
      delivery_address: 'Plot 5412, Extension 12',
      delivery_city: 'Gaborone',
    }),
  });
  const retailUnit20 = retail20.body?.items?.[0]?.unit_price;
  check(
    'a retail account does not reach wholesale pricing',
    retailUnit20 > unit20,
    `retail ${retailUnit20} vs business ${unit20}`,
  );

  // §20 — past the top band the answer is a quotation, not a guessed price.
  const order100 = await json(business, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ product_id: 'p001', variant_id: 'p001v1', qty: 100 }],
      payment_method: 'DPO_PAY',
      delivery_address: 'Plot 220, Block 6',
      delivery_city: 'Gaborone',
    }),
  });
  check('qty 100 is refused and routed to a quotation', order100.status === 409, `got ${order100.status}`);
  check(
    'the refusal explains why',
    /quotation/i.test(order100.body?.error ?? ''),
    order100.body?.error,
  );
}

// ── 14. Supplier cost confidentiality (§5) ───────────────────────────────────

section('14. Supplier cost confidentiality');
{
  const retail = sessions['thabo@gmail.com'].jar;

  const page = await request(retail, '/products/p001');
  const html = await page.text();

  check(
    'the storefront page payload carries no supplier_cost field',
    !html.includes('supplier_cost'),
    'confidential cost serialised into the page',
  );
  check(
    'no transparent-procurement toggle is exposed to a retail buyer',
    !/Confidential Cost/i.test(html),
  );

  // Staff may see costs; that is the point of the admin console.
  const admin = sessions['admin@afrideal.co.bw'].jar;
  const detail = (await json(admin, '/api/products/p001')).body;
  check(
    'admin API still exposes cost for routing decisions',
    typeof detail?.selection?.all?.[0]?.offer?.supplier_cost === 'number',
  );
}

// ── 15. RFQ module (§21) ─────────────────────────────────────────────────────

section('15. RFQ — quotation requests');
{
  const business = sessions['kefilwe@gmail.com'].jar;
  const naledi = sessions['supplier@naledi.co.bw'].jar;
  const glowup = sessions['supplier@glowup.co.za'].jar;

  const created = await json(business, '/api/rfqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: 'p001',
      requested_quantity: 400,
      target_price: 120,
      delivery_location: 'Gaborone',
      notes: 'Verification probe.',
    }),
  });

  check('a buyer can submit an RFQ', created.status === 201, `got ${created.status}`);
  check('suppliers carrying the product are invited', created.body?.invited > 0, `${created.body?.invited}`);

  const rfqId = created.body?.rfq?.id;

  if (rfqId) {
    // §5 — the customer sees that quotes exist, never each supplier's number.
    const asCustomer = (await json(business, `/api/rfqs/${rfqId}`)).body;
    check('customer sees no individual supplier quotes', asCustomer?.responses?.length === 0);
    check('customer sees a response count', typeof asCustomer?.response_count === 'number');

    // A supplier answers.
    const quoted = await json(naledi, `/api/rfqs/${rfqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RESPOND',
        unit_price: 68,
        quantity: 400,
        lead_time_days: 9,
        minimum_order_quantity: 100,
        shipping_terms: 'Ex-works',
      }),
    });
    check('an invited supplier can quote', quoted.status === 200, `got ${quoted.status}`);

    // §12 — and cannot see a competitor's quote.
    const asRival = (await json(glowup, `/api/rfqs/${rfqId}`)).body;
    const rivalSees = (asRival?.responses ?? []).filter((r) => r.supplier_id !== 's002');
    check('a supplier cannot see a competitor quote', rivalSees.length === 0, `${rivalSees.length} leaked`);

    // Staff compare everything and select one.
    const ops = sessions['ops@afrideal.co.bw'].jar;
    const asStaff = (await json(ops, `/api/rfqs/${rfqId}`)).body;
    check('staff see every response', (asStaff?.responses ?? []).length >= 1);

    const target = asStaff?.responses?.[0];
    if (target) {
      const selected = await json(ops, `/api/rfqs/${rfqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELECT_RESPONSE', response_id: target.id }),
      });
      check('staff can select a winning quote', selected.status === 200, `got ${selected.status}`);
    }

    const runner = sessions['runner@afrideal.co.bw'].jar;
    const denied = await json(runner, `/api/rfqs/${rfqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SET_STATUS', status: 'DECLINED' }),
    });
    check('a runner cannot triage an RFQ', denied.status === 403, `got ${denied.status}`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(52)}`);
console.log(`${passed} passed, ${failures.length} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\nAll checks passed.');
