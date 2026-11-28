import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/modules/theme/theme';
import { themeOptions } from '@/modules/theme/theme-options';
import { PageHeader } from '@/modules/layouts/page-header';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="How the helpdesk looks for you."
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose a theme, or follow your system setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2 sm:max-w-sm"
          >
            {themeOptions.map(({ value, label, Icon }) => (
              <Button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                variant={theme === value ? 'default' : 'outline'}
                onClick={() => setTheme(value)}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
