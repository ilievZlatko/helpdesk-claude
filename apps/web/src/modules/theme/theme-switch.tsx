import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from './theme';

/**
 * One-click theme button: flips between light and dark based on what is shown
 * now, and shows the matching icon (sun in light, moon in dark). Until it is
 * clicked the theme follows the OS (`system`); "System" can be picked again in
 * the user menu or Settings.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className={cn('rounded-full', className)}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <MoonIcon aria-hidden /> : <SunIcon aria-hidden />}
    </Button>
  );
}
