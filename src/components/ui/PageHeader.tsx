import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

function PageHeader({ title, subtitle, kicker, icon, actions }: Props) {
  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
            {icon}
          </div>
        ) : null}
        <div>
          {kicker ? <p className="text-sm uppercase tracking-wide text-ink-500">{kicker}</p> : null}
          <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
          {subtitle ? <p className="text-xs text-ink-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
