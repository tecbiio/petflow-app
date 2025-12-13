import { useState } from "react";
import { Link } from "react-router-dom";
import UploadDropzone from "../components/UploadDropzone";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { api } from "../api/client";

function Adjustments() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
  const isLoading = loadingProducts || loadingLocations;
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExportMessage(null);
    setDownloadingExport(true);
    try {
      const { blob, filename } = await api.downloadDisposalMovements();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? "mouvements_perso_poubelle_don.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setDownloadingExport(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        subtitle="Import de PDF (facture/avoir/BL) pour générer des mouvements de stock."
        actions={
          <button
            type="button"
            onClick={handleExport}
            className="btn btn-outline border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
            disabled={downloadingExport}
          >
            {downloadingExport ? "Export…" : "Exporter Excel PERSO/POUBELLE/DON"}
          </button>
        }
      />
      {exportMessage ? <p className="text-sm text-rose-600">{exportMessage}</p> : null}
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
