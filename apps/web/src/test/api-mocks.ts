// Test helpers for code that calls the API through `apiClient` (lib/api.ts):
// stub its `get` with axios-shaped results instead of hitting the network.
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiClient } from '@/lib/api';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

/** A successful axios response with `data` as the JSON body. */
export function apiResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: '', headers: {}, config };
}

/** What axios rejects with for a non-2xx response. */
export function apiErrorResponse(status: number): AxiosError {
  const response = apiResponse(null, status);
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response,
  );
}

/** What axios rejects with when the server can't be reached. */
export function apiNetworkError(): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {});
}

/** Stubs `apiClient.get`; returns the spy to check calls or chain results. */
export function mockApiGet() {
  return vi.spyOn(apiClient, 'get');
}
