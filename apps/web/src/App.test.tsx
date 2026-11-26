import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import App from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('shows the API status when the health check succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ status: 'ok', timestamp: new Date().toISOString() }),
    );

    renderApp();

    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('shows "unreachable" when the API is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    renderApp();

    expect(await screen.findByText('unreachable')).toBeInTheDocument();
  });
});
