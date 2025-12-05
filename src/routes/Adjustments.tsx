import UploadDropzone from "../components/UploadDropzone";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";

function Adjustments() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <h2 className="text-lg font-semibold text-ink-900">Import de documents</h2>
        {defaultLocationId ? (
          <div className="mt-3">
            <UploadDropzone stockLocationId={defaultLocationId} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-600">
            {loadingProducts || loadingLocations
              ? "Chargement des données…"
              : "Ajoute un emplacement pour activer l'upload."}
          </p>
        )}
      </div>
    </div>
  );
}

export default Adjustments;
