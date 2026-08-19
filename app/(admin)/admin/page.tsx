import { redirect } from 'next/navigation';

/** Bare /admin has nothing of its own — send operators to the dashboard. */
export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
