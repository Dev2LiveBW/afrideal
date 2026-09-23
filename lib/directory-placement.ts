/**
 * Where the supplier / product directory lives. (TICKET-007)
 *
 * OPEN QUESTION - the product owner has not decided whether the directory is a
 * homepage section, a dedicated page, or a nav tab. Until they do, it is all
 * three behind these two switches, and the temporary entry points are the ones
 * marked `TODO(TICKET-007)` at their call sites:
 *
 *   - `components/layout/StorefrontNav.tsx`  the nav link, desktop and mobile
 *   - `app/(store)/page.tsx`                 the homepage preview section
 *   - `app/(supplier)/supplier/products`     the supplier's own listing view
 *
 * Once placement is confirmed, flip the flags below and delete whichever entry
 * point loses. Nothing else needs to change: the page at `DIRECTORY_ROUTE`
 * stands on its own either way.
 */

/** The dedicated page's route. Change here, not at the call sites. */
export const DIRECTORY_ROUTE = '/suppliers';

/** Label used wherever the directory is linked. */
export const DIRECTORY_LABEL = 'Suppliers';

/** Show the preview section on the homepage. */
export const DIRECTORY_ON_HOMEPAGE = true;

/** Show the directory as a storefront nav entry. */
export const DIRECTORY_IN_NAV = true;

/** How many cards the homepage preview shows before deferring to the full page. */
export const DIRECTORY_PREVIEW_COUNT = 8;
