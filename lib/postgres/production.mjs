/**
 * Which Neon endpoint is production (spec 0002, "Load guard").
 *
 * The compute endpoint of the Neon project's default branch, `production`
 * (project noisy-sky-21749196). A hostname only, no credentials, so it is not a
 * secret. When the project moves to the Company org or production gets a new
 * branch, update this one line.
 */
export const PRODUCTION_ENDPOINT_ID = 'ep-billowing-union-b5ozl001';

/**
 * Whether a connection string points at production. Matches the direct host,
 * the `-pooler` host and per-compute hosts, which all start with the endpoint id.
 */
export function isProductionDatabase(connectionString) {
  if (!connectionString) return false;
  let host;
  try {
    host = new URL(connectionString).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === PRODUCTION_ENDPOINT_ID || host.startsWith(`${PRODUCTION_ENDPOINT_ID}-`) || host.startsWith(`${PRODUCTION_ENDPOINT_ID}.`);
}
