import net from 'node:net';

/**
 * Let a TCP handshake take longer than Node's default allows.
 *
 * When a host has both IPv6 and IPv4 records, Node tries the addresses in
 * turn and gives each one 250 ms ("Happy Eyeballs"). Neon's pooler hosts
 * have both, and from Botswana a handshake to us-east-2 takes longer than
 * 250 ms, so every attempt is abandoned and the connection fails with
 * ETIMEDOUT in under a second. curl has no such budget, which is why the
 * host looks reachable from the shell and not from Node.
 *
 * Call before any connection opens. Plain JS so the .mjs scripts and
 * drizzle.config.ts can use it too. Harmless where the network is fast.
 */
export function allowSlowHandshakes(ms = 2000) {
  if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout !== 'function') return;
  if (net.getDefaultAutoSelectFamilyAttemptTimeout() < ms) {
    net.setDefaultAutoSelectFamilyAttemptTimeout(ms);
  }
}
