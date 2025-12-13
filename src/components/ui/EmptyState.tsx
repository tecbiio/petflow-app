import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="glass-panel p-6 text-center">
      {icon ? (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default EmptyState;

