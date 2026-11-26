import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fetchHealth } from '@/lib/api';

function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Helpdesk</CardTitle>
          <CardDescription>AI-powered ticket management</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm">
            API status: {health.isPending && <span>checking…</span>}
            {health.isError && (
              <span className="font-medium text-destructive">unreachable</span>
            )}
            {health.isSuccess && (
              <span className="font-medium text-green-600">
                {health.data.status}
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void health.refetch()}
            disabled={health.isFetching}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default App;
