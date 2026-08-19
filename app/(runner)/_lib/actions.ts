/**
 * Shared fetch wrapper for accepting a job. Used by both the job feed and the
 * job-alert modal so the request/response handling lives in exactly one
 * place; each caller still owns its own loading state, toast and refresh.
 */
export async function acceptShipment(shipmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/shipments/${shipmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ASSIGNED' }),
    });

    if (!response.ok) {
      const { error } = await response.json().catch(() => ({ error: 'Could not accept this job.' }));
      return { ok: false, error: error ?? 'Could not accept this job.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error — could not accept this job.' };
  }
}
