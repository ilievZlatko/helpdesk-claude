import { healthResponseSchema, type HealthResponse } from '@helpdesk/shared';

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
 * a non-2xx status and `InvalidResponseError` for a body that doesn't match;
 * network failures reject as usual (`TypeError`).
 */
export async function getJson<T>(url: string, schema: Schema<T>): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(url, response.status);
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new InvalidResponseError(url, result.error);
  return result.data;
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson('/api/health', healthResponseSchema);
}
