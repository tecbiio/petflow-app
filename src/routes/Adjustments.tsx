import UploadDropzone from "../components/UploadDropzone";
import ManualAdjustmentForm from "../components/ManualAdjustmentForm";
import InventoryEditor from "../components/InventoryEditor";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";

function Adjustments() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const defaultProductId = products[0]?.id;
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr,1.2fr]">
      <div className="space-y-4">
        <div className="glass-panel p-4">
          <h2 className="text-lg font-semibold text-ink-900">Import de documents</h2>
          <p className="text-xs text-ink-500">
            Dépose un BL/facture/avoir ici : le core parse le PDF, prévisualise, puis crée les mouvements via /documents/ingest.
          </p>
          {defaultProductId && defaultLocationId ? (
            <div className="mt-3">
              <UploadDropzone productId={defaultProductId} stockLocationId={defaultLocationId} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-600">
              {loadingProducts || loadingLocations ? "Chargement des données…" : "Ajoute un produit et un emplacement pour activer l'upload."}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-600">
            Place tes templates regex dans `petflow-core/pdf-templates/` si besoin d'ajuster la détection.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ManualAdjustmentForm products={products} locations={locations} />
        <InventoryEditor products={products} locations={locations} />
      </div>
    </div>
  );
}

export default Adjustments;
