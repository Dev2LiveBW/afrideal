import { DEFAULT_DELIVERY_COUNTRY } from './lanes.mjs';
import type { Country, CountryCode } from '@/types';

/** Where the shopper wants things delivered: a country and a town (spec 0009). */
export interface DeliverTo {
  country: CountryCode;
  city: string;
}

/** Until a shopper chooses. The market is any-to-any; this is only a starting point. */
export const DEFAULT_DELIVER_TO: DeliverTo = { country: DEFAULT_DELIVERY_COUNTRY, city: 'Gaborone' };

/**
 * "Deliver to" is kept in localStorage with the cart, which the server cannot
 * read, so a Maseru shopper's first paint came out in pula and Gaborone. This
 * cookie carries the same choice to the server so the first paint matches.
 */
export const DELIVER_TO_COOKIE = 'afrideal-deliver-to';

/** `LS:Maseru`, with the town encoded so it is a safe cookie value. */
export function encodeDeliverTo(deliverTo: DeliverTo): string {
  return `${deliverTo.country}:${encodeURIComponent(deliverTo.city)}`;
}

function decodeTown(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The cookie's choice when it names an active country and one of its towns; otherwise the default. */
export function decodeDeliverTo(value: string | undefined, countries: Country[]): DeliverTo {
  if (!value) return DEFAULT_DELIVER_TO;
  const split = value.indexOf(':');
  if (split < 0) return DEFAULT_DELIVER_TO;
  const country = countries.find((entry) => entry.code === value.slice(0, split));
  const city = decodeTown(value.slice(split + 1));
  return country && country.towns.includes(city) ? { country: country.code, city } : DEFAULT_DELIVER_TO;
}
