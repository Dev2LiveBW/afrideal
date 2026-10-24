import 'server-only';

import { readAll } from '@/lib/db';
import type { Country, CountryCode } from '@/types';

/**
 * The countries AfriDeal trades in (spec 0009). Reference data in the
 * `countries` collection, so onboarding a supplier, runner or courier in a new
 * country is a data change, never a code one.
 */

/** Active countries, in their display order. */
export async function activeCountries(): Promise<Country[]> {
  const rows = await readAll('countries');
  return rows.filter((row) => row.active).sort((a, b) => a.sort_order - b.sort_order);
}

/** Whether a code names an active country. Codes are compared upper-case. */
export async function isActiveCountry(code: string): Promise<boolean> {
  const wanted = code.trim().toUpperCase();
  return (await activeCountries()).some((country) => country.code === wanted);
}

/**
 * Code → name for display, e.g. `{ BW: 'Botswana' }`. Built once per request
 * and handed to client components, so they never need a list of their own.
 */
export async function countryNames(): Promise<Record<CountryCode, string>> {
  const rows = await readAll('countries');
  return Object.fromEntries(rows.map((row) => [row.code, row.name]));
}
