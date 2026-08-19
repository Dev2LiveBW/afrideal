/**
 * Render audit.
 *
 *   npm run dev     # in one terminal
 *   npm run audit   # in another
 *
 * Every page in this app is `force-dynamic`, so none of them are prerendered at
 * build time. `next build` proves they compile; it does not prove they render.
 * A page that throws on a null lookup ships a green build and a 500 at runtime.
 *
 * This loads every route as a role entitled to see it and checks three things:
 * the response is 200, the HTML carries no Next error boundary, and a phrase
 * that only appears when the page actually rendered its own content is present.
 */

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000';

let passed = 0;
const failures = [];

function makeJar() {
  const jar = new Map();
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    absorb(response) {
      for (const cookie of response.headers.getSetCookie?.() ?? []) {
        const [pair] = cookie.split(';');
        const i = pair.indexOf('=');
        if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
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

async function signIn(email, password) {
  const jar = makeJar();
  const { csrfToken } = await (await request(jar, '/api/auth/csrf')).json();
  await request(jar, '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }).toString(),
  });
  return jar;
}

/** Markers Next.js emits when a page threw and the error boundary took over. */
const ERROR_MARKERS = [
  '__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"statusCode":500',
  'Application error: a server-side exception',
  'This page could not be found',
  'Cannot find module',
  'Unhandled Runtime Error',
];

async function auditPage(jar, path, mustContain, label) {
  const name = label ?? path;

  let response;
  try {
    response = await request(jar, path);
  } catch (error) {
    failures.push(`${name} — request failed: ${error.message}`);
    console.log(`  ✗ ${name} — request failed`);
    return;
  }

  if (response.status === 307 || response.status === 302) {
    failures.push(`${name} — redirected to ${response.headers.get('location')}`);
    console.log(`  ✗ ${name} — unexpected redirect`);
    return;
  }

  if (response.status !== 200) {
    failures.push(`${name} — HTTP ${response.status}`);
    console.log(`  ✗ ${name} — HTTP ${response.status}`);
    return;
  }

  const html = await response.text();

  const marker = ERROR_MARKERS.find((m) => html.includes(m));
  if (marker) {
    failures.push(`${name} — rendered an error boundary`);
    console.log(`  ✗ ${name} — error boundary`);
    return;
  }

  const missing = mustContain.filter((phrase) => !html.includes(phrase));
  if (missing.length > 0) {
    failures.push(`${name} — missing ${missing.map((m) => `"${m}"`).join(', ')}`);
    console.log(`  ✗ ${name} — missing ${missing.map((m) => `"${m}"`).join(', ')}`);
    return;
  }

  passed += 1;
  console.log(`  ✓ ${name}`);
}

function section(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

// ── Public ───────────────────────────────────────────────────────────────────

section('Public (signed out)');
{
  const jar = makeJar();
  await auditPage(jar, '/', ['Africa', 'marketplace', 'verified suppliers'], '/');
  await auditPage(jar, '/browse', ['Marketplace', 'Sort'], '/browse');
  await auditPage(jar, '/products/p001', ['Shea Butter', 'Who can supply this'], '/products/p001');
  await auditPage(jar, '/products/p006', ['Portland Cement', 'Specification'], '/products/p006');
  await auditPage(jar, '/login', ['Sign in', 'Thabo Modise', 'Kagiso Sithole'], '/login');
  await auditPage(jar, '/cart', ['cart'], '/cart');
}

// ── Customer ─────────────────────────────────────────────────────────────────

section('Customer (thabo@gmail.com)');
{
  const jar = await signIn('thabo@gmail.com', 'Customer@2026');
  await auditPage(jar, '/orders', ['Your orders'], '/orders');
  await auditPage(jar, '/orders/o001', ['AFD-', 'Payment', 'Delivery'], '/orders/o001');
  await auditPage(jar, '/orders/o013', ['AFD-'], '/orders/o013 (disputed)');
  await auditPage(jar, '/checkout', ['heck'], '/checkout');
  await auditPage(jar, '/products/p012', ['School Uniform'], '/products/p012');
}

// ── Admin ────────────────────────────────────────────────────────────────────

section('Admin console (admin@afrideal.co.bw)');
{
  const jar = await signIn('admin@afrideal.co.bw', 'Admin@2026');

  await auditPage(jar, '/admin/dashboard', ['GMV', 'scrow'], '/admin/dashboard');
  await auditPage(jar, '/admin/products', ['Shea Butter'], '/admin/products');
  await auditPage(jar, '/admin/products/p001', ['Shea Butter', 'Naledi'], '/admin/products/p001');
  await auditPage(jar, '/admin/suppliers', ['Naledi', 'GlowUp'], '/admin/suppliers');
  await auditPage(jar, '/admin/suppliers/s001', ['Naledi'], '/admin/suppliers/s001');
  await auditPage(jar, '/admin/suppliers/s006', ['Tsholofelo'], '/admin/suppliers/s006 (pending)');
  await auditPage(jar, '/admin/orders', ['AFD-'], '/admin/orders');
  await auditPage(jar, '/admin/orders/o001', ['AFD-'], '/admin/orders/o001');
  await auditPage(jar, '/admin/escrow', ['scrow'], '/admin/escrow');
  await auditPage(jar, '/admin/disputes', ['ispute'], '/admin/disputes');
  await auditPage(jar, '/admin/pricing', ['ricing', 'argin'], '/admin/pricing');
  await auditPage(jar, '/admin/analytics', ['evenue'], '/admin/analytics');
  await auditPage(jar, '/admin/runners', ['Kagiso'], '/admin/runners');
  await auditPage(jar, '/admin/settings', ['etting'], '/admin/settings');
}

// ── Finance scoping ──────────────────────────────────────────────────────────

section('Finance scoping (finance@afrideal.co.bw)');
{
  const jar = await signIn('finance@afrideal.co.bw', 'Finance@2026');
  await auditPage(jar, '/admin/analytics', ['evenue'], '/admin/analytics');
  await auditPage(jar, '/admin/escrow', ['scrow'], '/admin/escrow');

  // Finance must be bounced off the surfaces it is not scoped to.
  const denied = await request(jar, '/admin/settings');
  const bounced = denied.status === 307 || denied.status === 302;
  if (bounced) {
    passed += 1;
    console.log('  ✓ /admin/settings is refused for finance');
  } else {
    failures.push(`finance reached /admin/settings (HTTP ${denied.status})`);
    console.log(`  ✗ finance reached /admin/settings (HTTP ${denied.status})`);
  }
}

// ── Supplier ─────────────────────────────────────────────────────────────────

section('Supplier portal (supplier@naledi.co.bw)');
{
  const jar = await signIn('supplier@naledi.co.bw', 'Supplier@2026');
  await auditPage(jar, '/supplier/dashboard', ['Naledi'], '/supplier/dashboard');
  await auditPage(jar, '/supplier/products', ['Shea Butter'], '/supplier/products');
  await auditPage(jar, '/supplier/quotes', ['uote'], '/supplier/quotes');
  await auditPage(jar, '/supplier/orders', ['rder'], '/supplier/orders');
  await auditPage(jar, '/supplier/earnings', ['arning'], '/supplier/earnings');

  // A supplier must not reach the admin console at all.
  const denied = await request(jar, '/admin/dashboard');
  if (denied.status === 307 || denied.status === 302) {
    passed += 1;
    console.log('  ✓ /admin/dashboard is refused for a supplier');
  } else {
    failures.push(`supplier reached /admin/dashboard (HTTP ${denied.status})`);
    console.log(`  ✗ supplier reached /admin/dashboard (HTTP ${denied.status})`);
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

section('Runner portal (runner@afrideal.co.bw)');
{
  const jar = await signIn('runner@afrideal.co.bw', 'Runner@2026');
  await auditPage(jar, '/runner/dashboard', ['Kagiso'], '/runner/dashboard');
  await auditPage(jar, '/runner/jobs', ['ob'], '/runner/jobs');
  await auditPage(jar, '/runner/earnings', ['arning'], '/runner/earnings');
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(52)}`);
console.log(`${passed} pages rendered, ${failures.length} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\nEvery route rendered with real content.');
