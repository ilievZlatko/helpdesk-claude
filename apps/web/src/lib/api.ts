import { healthResponseSchema, type HealthResponse } from '@helpdesk/shared';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return healthResponseSchema.parse(await response.json());
}
