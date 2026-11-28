import { QueryClient } from '@tanstack/react-query';
import { HttpError, InvalidResponseError } from './api';

/** Attempts after the first one, for errors that can go away on their own. */
const MAX_RETRIES = 2;

/**
 * Retry only failures that might succeed next time: network errors and 5xx.
 * A 4xx (e.g. 401, 403, 404) or a body that doesn't match the schema will
 * fail the same way again, so show the error right away instead of after
 * several seconds of retries.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof InvalidResponseError) return false;
  if (error instanceof HttpError && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
  });
}
