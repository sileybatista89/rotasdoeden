import { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminSectionHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6 sm:p-8">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80 mb-2">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
