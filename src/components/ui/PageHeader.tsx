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
    <div className="panel flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
            {icon}
          </div>
        ) : null}
        <div>
          {kicker ? <p className="text-xs uppercase tracking-wide text-ink-500">{kicker}</p> : null}
          <h1 className="text-2xl font-semibold leading-tight text-ink-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-ink-600">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
