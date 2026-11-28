import type { ReactNode } from 'react';

type PageHeaderProps = {
  /** The page's h1. */
  title: ReactNode;
  /** One line under the title. */
  description?: ReactNode;
};

/**
 * The title block at the top of every signed-in page. Its padding keeps it
 * clear of the app header above and of the page content below. The
 * description sits on the page gradient, so it uses darkened slate rather
 * than `text-muted-foreground`.
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pt-4 pb-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
