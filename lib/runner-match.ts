import type { CountryCode, Runner } from '@/types';

/**
 * Which runners a job reaches (spec 0009, and spec 0005's service area).
 *
 * Runners are onboarded wherever they are, so a job goes to the online runners
 * who serve its pickup town in its country: a Maseru pickup reaches Maseru
 * runners, not Gaborone ones. If nobody online serves that town the job still
 * goes to every online runner rather than to no one; spec 0005 replaces that
 * fallback with its 30-minute widening.
 */

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whether a runner works the given town in the given country. */
export function servesPlace(runner: Runner, country: CountryCode, town: string): boolean {
  if (!same(runner.country ?? '', country)) return false;
  const towns = runner.towns?.length ? runner.towns : [runner.city];
  return towns.some((served) => same(served, town));
}

/** The online runners to alert about a job collected at `pickup`. */
export function runnersForJob(
  runners: Runner[],
  pickup: { country: CountryCode | null | undefined; town: string | null | undefined },
): Runner[] {
  const online = runners.filter((runner) => runner.online);
  if (!pickup.country || !pickup.town) return online;
  const local = online.filter((runner) => servesPlace(runner, pickup.country!, pickup.town!));
  return local.length > 0 ? local : online;
}
