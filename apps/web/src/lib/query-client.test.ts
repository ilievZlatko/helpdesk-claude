import { apiNetworkError } from '@/test/api-mocks';
import { HttpError, InvalidResponseError } from './api';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 422])('does not retry a %i', (status) => {
    expect(shouldRetry(0, new HttpError('/api/x', status))).toBe(false);
  });

  it('does not retry a response that does not match the schema', () => {
    expect(shouldRetry(0, new InvalidResponseError('/api/x', null))).toBe(
      false,
    );
  });

  it.each([
    ['a 5xx', new HttpError('/api/x', 503)],
    ['a network error', apiNetworkError()],
  ])('retries %s twice, then gives up', (_, error) => {
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});
