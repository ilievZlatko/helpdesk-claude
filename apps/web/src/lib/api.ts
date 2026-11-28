import axios from 'axios';
import { healthResponseSchema, type HealthResponse } from '@helpdesk/shared';

/**
 * The app's HTTP client for its own API. Requests use relative `/api/...`
 * URLs (Vite proxies them in dev), so the session cookie goes along without
 * extra config. better-auth's client (`modules/auth/auth-client.ts`) has its
 * own HTTP layer and doesn't use this.
 */
export const apiClient = axios.create({
  headers: { Accept: 'application/json' },
});

/** The API answered with a non-2xx status. */
export class HttpError extends Error {
  readonly status: number;

  constructor(url: string, status: number) {
    super(`${url} failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** The API answered, but the body doesn't match the shared schema. */
export class InvalidResponseError extends Error {
  constructor(url: string, cause: unknown) {
    super(`${url} returned an unexpected response`, { cause });
    this.name = 'InvalidResponseError';
  }
}

/** Anything with Zod's `safeParse` (the shared schemas). */
type Schema<T> = {
  safeParse(
    data: unknown,
  ): { success: true; data: T } | { success: false; error: unknown };
};

/**
 * GETs `url` and validates the JSON body with `schema`. Throws `HttpError` for
 * a non-2xx status and `InvalidResponseError` for a body that doesn't match.
 * Other failures (network errors, timeouts) reject with axios's own error.
 */
export async function getJson<T>(url: string, schema: Schema<T>): Promise<T> {
  let data: unknown;
  try {
    ({ data } = await apiClient.get<unknown>(url));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new HttpError(url, error.response.status);
    }
    throw error;
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new InvalidResponseError(url, result.error);
  return result.data;
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson('/api/health', healthResponseSchema);
}
