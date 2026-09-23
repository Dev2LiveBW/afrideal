import 'server-only';
import { createClient, type SanityClient } from '@sanity/client';

/**
 * The Sanity connection for the catalogue.
 *
 * Reads need no token because the `production` dataset is public. Writes
 * (the few the app makes - a supplier's verification status, a runner's
 * online flag) need `SANITY_API_WRITE_TOKEN`; without it those calls fail
 * loudly rather than silently editing the wrong store.
 *
 * `useCdn` is off on purpose: the point of the demo is that a change
 * published in the Studio shows on the next request, not a minute later.
 */

export const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'bly84glb';
export const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const API_VERSION = process.env.SANITY_API_VERSION ?? '2025-08-15';

let readClient: SanityClient | null = null;
let writeClient: SanityClient | null = null;

export function sanityRead(): SanityClient {
  readClient ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'published',
  });
  return readClient;
}

export function sanityWrite(): SanityClient {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'SANITY_API_WRITE_TOKEN is not set. Catalogue edits are made in the Studio; ' +
        'to let the app write to Sanity, create an Editor token at sanity.io/manage and add it to .env.local.',
    );
  }
  writeClient ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    token,
  });
  return writeClient;
}
