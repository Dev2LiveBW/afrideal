import { handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = handled(async () => ok(await readAll('suppliers')));
