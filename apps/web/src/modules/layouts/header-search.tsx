import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Search field in the header. Placeholder for now: it accepts input but does
 * not search anything yet.
 */
export function HeaderSearch({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <MagnifyingGlassIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Search"
        placeholder="Search…"
        className="h-9 rounded-full border-sidebar-border bg-background/60 pl-9 shadow-none backdrop-blur-md dark:bg-white/5"
      />
    </div>
  );
}
