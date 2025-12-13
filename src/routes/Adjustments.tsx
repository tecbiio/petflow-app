import { Link } from "react-router-dom";
import UploadDropzone from "../components/UploadDropzone";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

function Adjustments() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
  const isLoading = loadingProducts || loadingLocations;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        subtitle="Import de PDF (facture/avoir/BL) pour générer des mouvements de stock."
      />
      {isLoading ? (
        <div className="panel">
          <p className="text-sm text-ink-600">Chargement…</p>
        </div>
      ) : defaultLocationId ? (
        <UploadDropzone stockLocationId={defaultLocationId} />
      ) : (
        <EmptyState
          title="Aucun emplacement configuré"
          description="Crée un emplacement (idéalement par défaut) pour activer l'import de documents."
          action={
            <Link to="/locations" className="btn btn-primary">
              Créer un emplacement
            </Link>
          }
        />
      )}
    </div>
  );
}

export default Adjustments;
