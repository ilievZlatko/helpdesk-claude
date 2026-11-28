import { healthResponseSchema } from '@helpdesk/shared';
import {
  apiErrorResponse,
  apiNetworkError,
  apiResponse,
  mockApiGet,
} from '@/test/api-mocks';
import { HttpError, InvalidResponseError, getJson } from './api';

const health = { status: 'ok', timestamp: '2026-11-28T10:00:00.000Z' };

describe('getJson', () => {
  it('GETs the URL and returns the parsed body', async () => {
    const get = mockApiGet().mockResolvedValue(apiResponse(health));

    await expect(getJson('/api/health', healthResponseSchema)).resolves.toEqual(
      health,
    );
    expect(get).toHaveBeenCalledWith('/api/health');
  });

  it.each([403, 404, 500, 503])(
    'throws an HttpError with the status for a %i',
    async (status) => {
      mockApiGet().mockRejectedValue(apiErrorResponse(status));

      const error = await getJson('/api/health', healthResponseSchema).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(status);
    },
  );

  it('throws an InvalidResponseError for a body that does not match', async () => {
    mockApiGet().mockResolvedValue(apiResponse({ status: 'maybe' }));

    await expect(
      getJson('/api/health', healthResponseSchema),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it('lets network failures through as they are', async () => {
    const networkError = apiNetworkError();
    mockApiGet().mockRejectedValue(networkError);

    await expect(getJson('/api/health', healthResponseSchema)).rejects.toBe(
      networkError,
    );
  });
});
