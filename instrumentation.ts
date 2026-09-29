/**
 * Runs once when the Next server boots, before any request.
 *
 * Every outbound call the server makes - Clerk, Neon, Sanity - crosses an
 * ocean from Botswana, and Node abandons a TCP handshake after 250 ms per
 * address when a host has IPv6 and IPv4 records. Raise that budget here so
 * the first Clerk lookup of a request is as safe as the database calls that
 * come after it. Only the Node runtime has `node:net`; the Edge runtime
 * (middleware) never opens sockets itself.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { allowSlowHandshakes } = await import('./lib/postgres/network.mjs');
    allowSlowHandshakes();
  }
}
