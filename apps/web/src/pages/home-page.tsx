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
import { authClient } from '@/lib/auth-client';

export function HomePage() {
  const { data: session } = authClient.useSession();
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {session?.user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-powered ticket management
        </p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>Connection to the helpdesk API</CardDescription>
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
    </div>
  );
}
