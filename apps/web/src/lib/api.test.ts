import { healthResponseSchema } from '@helpdesk/shared';
import { HttpError, InvalidResponseError, getJson } from './api';

const health = { status: 'ok', timestamp: '2026-11-28T10:00:00.000Z' };

describe('getJson', () => {
  it('returns the parsed body', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(health));

    await expect(getJson('/api/health', healthResponseSchema)).resolves.toEqual(
      health,
    );
    expect(fetch).toHaveBeenCalledWith('/api/health');
  });

  it('throws an HttpError with the status for a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 403 }),
    );

    const error = await getJson('/api/health', healthResponseSchema).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(403);
  });

  it('throws an InvalidResponseError for a body that does not match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ status: 'maybe' }),
    );

    await expect(
      getJson('/api/health', healthResponseSchema),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it('lets network failures through', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    await expect(
      getJson('/api/health', healthResponseSchema),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
