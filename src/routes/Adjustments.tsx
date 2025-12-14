import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import UploadDropzone from "../components/UploadDropzone";
import ConfirmModal from "../components/ConfirmModal";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { api } from "../api/client";
import { AxonautInvoiceLines, MovementSign } from "../types";

function Adjustments() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
  const isLoading = loadingProducts || loadingLocations;
  const queryClient = useQueryClient();
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [invoicePreview, setInvoicePreview] = useState<AxonautInvoiceLines[] | null>(null);
  const [invoiceMovementSign, setInvoiceMovementSign] = useState<MovementSign>("OUT");

  const axonautConfig = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });

  const pendingInvoicesQuery = useQuery({
    queryKey: ["axonaut-invoices-pending"],
    queryFn: () => api.axonautPendingInvoices(),
    enabled: axonautConfig.data?.hasApiKey === true,
  });

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

  const syncInvoices = useMutation({
    mutationFn: () => api.axonautSyncInvoices(),
    onSuccess: (res) => {
      queryClient.setQueryData(["axonaut-invoices-pending"], {
        lastSyncAt: res.lastSyncAtAfter,
        blockedUntil: res.blockedUntil ?? null,
        pending: res.pending,
        invoices: res.invoices,
      });
      if (res.skipped) {
        if (res.reason === "QUOTA") {
          const untilLabel = res.blockedUntil ? new Date(res.blockedUntil).toLocaleString("fr-FR") : "—";
          setInvoiceMessage(`Quota Axonaut atteint : synchronisation en pause jusqu’au ${untilLabel}.`);
        } else if (res.reason === "TOO_RECENT") {
          setInvoiceMessage("Synchronisation déjà effectuée récemment (pause anti-quota).");
        } else {
          setInvoiceMessage("Synchronisation ignorée.");
        }
      } else {
        setInvoiceMessage(
          res.added > 0
            ? `${res.added} nouvelle(s) facture(s) synchronisée(s).`
            : "Synchronisation Axonaut OK.",
        );
      }
      setSelectedInvoiceIds(new Set());
    },
    onError: (err: Error) => setInvoiceMessage(err.message),
  });

  const previewInvoices = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedInvoiceIds.values());
      if (ids.length === 0) {
        throw new Error("Sélectionnez au moins une facture Axonaut.");
      }
      const previews = await Promise.all(ids.map((id) => api.axonautGetInvoiceLines(id)));
      return previews;
    },
    onSuccess: (res) => {
      setInvoiceMessage(null);
      setInvoicePreview(res);
    },
    onError: (err: Error) => setInvoiceMessage(err.message),
  });

  const importInvoices = useMutation({
    mutationFn: async () => {
      if (!defaultLocationId) {
        throw new Error("Aucun emplacement de stock disponible.");
      }
      if (!invoicePreview || invoicePreview.length === 0) {
        throw new Error("Aucune facture à importer.");
      }

      const results: Array<{
        invoiceId: string | number;
        created: number;
        skipped: number;
        alreadyImported?: boolean;
        error?: string;
      }> = [];
      const importedInvoiceIds: Array<string | number> = [];
      let totalCreated = 0;
      let totalSkipped = 0;
      let alreadyImportedCount = 0;
      let errorsCount = 0;

      for (const item of invoicePreview) {
        const invoiceId = item.invoice.id;
        const sourceDocumentId = `axonaut:invoice:${invoiceId}`;
        const createdAt = item.invoice.date;
        try {
          const res = await api.ingestDocument({
            docType: "FACTURE",
            stockLocationId: defaultLocationId,
            sourceDocumentId,
            movementSign: invoiceMovementSign,
            createdAt,
            lines: item.lines ?? [],
          });

          totalCreated += res.created ?? 0;
          totalSkipped += res.skipped?.length ?? 0;
          if (res.alreadyImported) alreadyImportedCount += 1;
          importedInvoiceIds.push(invoiceId);
          results.push({
            invoiceId,
            created: res.created ?? 0,
            skipped: res.skipped?.length ?? 0,
            alreadyImported: res.alreadyImported,
          });
        } catch (err) {
          errorsCount += 1;
          results.push({
            invoiceId,
            created: 0,
            skipped: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      let markImportedError: string | null = null;
      if (importedInvoiceIds.length > 0) {
        try {
          await api.axonautMarkInvoicesImported(importedInvoiceIds);
          await queryClient.invalidateQueries({ queryKey: ["axonaut-invoices-pending"] });
        } catch (err) {
          markImportedError = err instanceof Error ? err.message : String(err);
        }
      }

      return { totalCreated, totalSkipped, alreadyImportedCount, results, errorsCount, markImportedError };
    },
    onSuccess: (res) => {
      const suffix = res.alreadyImportedCount ? ` · ${res.alreadyImportedCount} déjà importée(s)` : "";
      const errorsSuffix = res.errorsCount ? ` · ${res.errorsCount} erreur(s)` : "";
      const markSuffix = res.markImportedError ? " · warning: impossible de marquer importées côté synchro" : "";
      setInvoiceMessage(
        `Import terminé : ${res.totalCreated} mouvements créés · ${res.totalSkipped} lignes ignorées${suffix}${errorsSuffix}${markSuffix}.`,
      );
      setInvoicePreview(null);
      setSelectedInvoiceIds(new Set());
    },
    onError: (err: Error) => setInvoiceMessage(err.message),
  });

  const invoiceList = pendingInvoicesQuery.data?.invoices ?? [];
  const previewRows = useMemo(() => {
    if (!invoicePreview) return [];
    return invoicePreview.flatMap((item) =>
      (item.lines ?? []).map((line) => ({
        invoiceLabel: item.invoice.number ?? String(item.invoice.id),
        ...line,
      })),
    );
  }, [invoicePreview]);

  const allSelected = invoiceList.length > 0 && selectedInvoiceIds.size === invoiceList.length;
  const selectedCount = selectedInvoiceIds.size;
  const lastSyncAt = pendingInvoicesQuery.data?.lastSyncAt;
  const blockedUntil = pendingInvoicesQuery.data?.blockedUntil ?? null;

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
        <div className="space-y-4">
          <UploadDropzone stockLocationId={defaultLocationId} />

          <div className="panel space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Importer des factures Axonaut</h3>
                <p className="text-xs text-ink-600">
                  Récupère les factures créées sur Axonaut et génère des mouvements de stock (comme un import de document).
                </p>
              </div>
              <span className="pill bg-ink-100 text-ink-700">Synchro auto à la connexion</span>
            </div>

            {axonautConfig.data?.hasApiKey !== true ? (
              <p className="text-xs text-amber-700">Ajoutez une clé Axonaut dans les réglages pour activer l'import.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="text-xs text-ink-600">
                    Dernière synchro :{" "}
                    <span className="font-semibold text-ink-800">
                      {lastSyncAt ? new Date(lastSyncAt).toLocaleString("fr-FR") : "—"}
                    </span>
                    {blockedUntil ? ` · Pause quota jusqu’au ${new Date(blockedUntil).toLocaleString("fr-FR")}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => syncInvoices.mutate()}
                    className="btn btn-secondary btn-sm"
                    disabled={syncInvoices.isPending || Boolean(blockedUntil)}
                    title="Relance la synchronisation (dernier intervalle)."
                  >
                    {syncInvoices.isPending ? "Synchronisation…" : "Synchroniser maintenant"}
                  </button>
                </div>

                {invoiceList.length > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-ink-700">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoiceIds(new Set(invoiceList.map((inv) => String(inv.id))));
                            } else {
                              setSelectedInvoiceIds(new Set());
                            }
                          }}
                        />
                        Tout sélectionner
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-ink-700">
                          Sens
                          <select
                            value={invoiceMovementSign}
                            onChange={(e) => setInvoiceMovementSign(e.target.value as MovementSign)}
                            className="input !w-auto"
                          >
                            <option value="OUT">Sortie (-)</option>
                            <option value="IN">Entrée (+)</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => previewInvoices.mutate()}
                          className="btn btn-primary btn-sm"
                          disabled={selectedCount === 0 || previewInvoices.isPending}
                        >
                          {previewInvoices.isPending ? "Préparation…" : `Prévisualiser (${selectedCount})`}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-auto rounded-lg border border-ink-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-ink-50 text-left text-xs text-ink-600">
                          <tr>
                            <th className="w-10 px-3 py-2" />
                            <th className="px-3 py-2">Facture</th>
                            <th className="px-3 py-2">Client</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100 bg-white">
                          {invoiceList.map((inv) => {
                            const id = String(inv.id);
                            const checked = selectedInvoiceIds.has(id);
                            return (
                              <tr key={id} className={checked ? "bg-ink-50" : undefined}>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setSelectedInvoiceIds((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(id);
                                        else next.delete(id);
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 font-semibold text-ink-900">
                                  {inv.number ?? `#${id}`}
                                </td>
                                <td className="px-3 py-2 text-ink-700">{inv.customerName ?? "—"}</td>
                                <td className="px-3 py-2 text-ink-700">
                                  {inv.date ? new Date(inv.date).toLocaleDateString("fr-FR") : "—"}
                                </td>
                                <td className="px-3 py-2 text-ink-600">{inv.status ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-ink-600">
                    {pendingInvoicesQuery.isLoading ? "Chargement…" : "Aucune facture synchronisée à importer."}
                  </p>
                )}
              </>
            )}

            {invoiceMessage ? <p className="text-xs text-ink-600">{invoiceMessage}</p> : null}
          </div>
        </div>
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

      {invoicePreview ? (
        <ConfirmModal
          title="Vérification des lignes Axonaut"
          description="Confirmez pour créer les mouvements de stock à partir des factures sélectionnées."
          size="xl"
          onClose={() => (importInvoices.isPending ? null : setInvoicePreview(null))}
          onConfirm={() => importInvoices.mutate()}
          canClose={!importInvoices.isPending}
          cancelDisabled={importInvoices.isPending}
          confirmDisabled={importInvoices.isPending}
          confirmLabel={importInvoices.isPending ? "Création…" : "Valider les mouvements"}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-700">
              <span>{invoicePreview.length} facture(s)</span>
              <span>{previewRows.length} ligne(s)</span>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-600">
                    <th className="px-2 py-1">Facture</th>
                    <th className="px-2 py-1">Référence</th>
                    <th className="px-2 py-1">Description</th>
                    <th className="px-2 py-1">Axonaut</th>
                    <th className="px-2 py-1">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 150).map((row, idx) => (
                    <tr key={`${row.invoiceLabel}-${idx}`} className="border-t border-ink-100">
                      <td className="px-2 py-1 text-ink-700">{row.invoiceLabel}</td>
                      <td className="px-2 py-1">{row.reference}</td>
                      <td className="px-2 py-1 text-ink-600">{row.description ?? "—"}</td>
                      <td className="px-2 py-1 text-ink-600">
                        {row.axonautProductId ? (
                          <span className="rounded-full bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700">
                            #{row.axonautProductId}
                            {row.axonautProductName ? ` · ${row.axonautProductName}` : ""}
                          </span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 font-semibold">{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 150 ? (
              <p className="text-xs text-ink-500">Aperçu tronqué (150 premières lignes).</p>
            ) : null}
            {importInvoices.isError ? (
              <p className="text-xs text-amber-700">{(importInvoices.error as Error).message}</p>
            ) : null}
          </div>
        </ConfirmModal>
      ) : null}
    </div>
  );
}

export default Adjustments;
