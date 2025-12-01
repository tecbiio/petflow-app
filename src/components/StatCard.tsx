type Props = {
  title: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "info";
};

function StatCard({ title, value, hint, tone = "default" }: Props) {
  const colors = {
    default: "from-white to-ink-50 text-ink-900",
    warning: "from-amber-50 to-amber-100 text-amber-900",
    info: "from-brand-50 to-white text-brand-900",
  }[tone];

  return (
    <div className={`glass-panel relative overflow-hidden bg-gradient-to-br ${colors} px-4 py-4`}>
      <p className="text-xs uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-sm text-ink-500">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
