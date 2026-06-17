// src/lib/api.ts — typed API surface for the FastAPI backend
// Never import a raw URL here; always use the env var.

export interface LeadPayload {
  /** Minecraft username or display name */
  username: string;
  /** Contact email address */
  email: string;
  /** Optional freeform message / reason for joining */
  message?: string;
}

export type LeadResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * POST /leads — submit a participant enrollment request to the FastAPI backend.
 *
 * Requires the PUBLIC_API_BASE_URL env var (set in .env or at build time).
 * Example: PUBLIC_API_BASE_URL=https://api.berongsmp.dev
 */
export async function submitLead(data: LeadPayload): Promise<LeadResult> {
  const baseUrl = import.meta.env.PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    console.error('[api] PUBLIC_API_BASE_URL is not set');
    return { ok: false, error: 'API not configured.' };
  }

  try {
    const res = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return { ok: false, error: `Server error ${res.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  }
}
