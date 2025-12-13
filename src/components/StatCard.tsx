type Props = {
  title: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "info";
  onClick?: () => void;
};

function StatCard({ title, value, hint, tone = "default", onClick }: Props) {
  const colors = {
    default: "from-white to-ink-50 text-ink-900",
    warning: "from-amber-50 to-amber-100 text-amber-900",
    info: "from-brand-50 to-white text-brand-900",
  }[tone];

  const className = `panel relative overflow-hidden bg-gradient-to-br ${colors}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-200`}
      >
        <p className="text-xs uppercase tracking-wide text-ink-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-sm text-ink-500">{hint}</p> : null}
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-sm text-ink-500">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
