type Props = {
  label?: string;
};

function InventoryStatusBadge({ label = "Inventaire manquant — stock estimé" }: Props) {
  return <span className="pill bg-amber-50 text-amber-800">{label}</span>;
}

export default InventoryStatusBadge;
