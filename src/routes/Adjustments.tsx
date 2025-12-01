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
  const writesDisabled = true;

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <h2 className="text-lg font-semibold text-ink-900">Import d'un document</h2>
        <p className="text-xs text-ink-500">
          Déposez une facture/commande/avoir : un mouvement sera créé via /stock-movements (payload multipart) dès que l'endpoint sera ouvert.
        </p>
        {defaultProductId && defaultLocationId ? (
          <div className="mt-3">
            <UploadDropzone productId={defaultProductId} stockLocationId={defaultLocationId} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-600">
            {loadingProducts || loadingLocations ? "Chargement des données…" : "Ajoutez un produit et un emplacement pour activer le dropzone."}
          </p>
        )}
        {writesDisabled ? (
          <p className="mt-2 text-xs text-amber-700">
            Les actions de création sont désactivées tant que l'API reste en lecture seule.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ManualAdjustmentForm products={products} locations={locations} />
        <InventoryEditor products={products} locations={locations} />
      </div>
    </div>
  );
}

export default Adjustments;
