import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import MovementInventoryModal from "../components/MovementInventoryModal";
import ConfirmModal from "../components/ConfirmModal";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import StockValuationChart from "../components/StockValuationChart";
import SearchSelect from "../components/SearchSelect";
import PageHeader from "../components/ui/PageHeader";
import { useProducts } from "../hooks/useProducts";
import { useSettings } from "../hooks/useSettings";
import { useStockLocations } from "../hooks/useStockLocations";
import { useStockValuations } from "../hooks/useStockValuations";
import { AxonautInvoiceLines, Inventory, MovementSign } from "../types";
import { api } from "../api/client";
import logo from "../assets/petflow-logo.svg";

function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings, update } = useSettings();
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showClearInvoicesModal, setShowClearInvoicesModal] = useState(false);
  const [axonautMessage, setAxonautMessage] = useState<string | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<AxonautInvoiceLines[] | null>(null);
  const [invoiceMovementSign, setInvoiceMovementSign] = useState<MovementSign>("OUT");
  const [valuationLocationId, setValuationLocationId] = useState<number | "all">("all");
  const [valuationLocationSearch, setValuationLocationSearch] = useState("Tous les emplacements");
  const { data: valuationPoints = [], isLoading: loadingValuations } = useStockValuations({
    days: 30,
    stockLocationId: valuationLocationId,
  });

  const axonautConfig = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });

  const pendingInvoices = useQuery({
    queryKey: ["axonaut-invoices-pending"],
    queryFn: () => api.axonautPendingInvoices(),
    enabled: axonautConfig.data?.hasApiKey === true,
  });

  const syncInvoices = useMutation({
    mutationFn: () => api.axonautSyncInvoices(),
    onSuccess: (res) => {
      queryClient.setQueryData(["axonaut-invoices-pending"], {
        lastSyncAt: res.lastSyncAtAfter,
        blockedUntil: res.blockedUntil ?? null,
        pending: res.pending,
        invoices: res.invoices,
      });
    },
  });

  const clearPendingInvoices = useMutation({
    mutationFn: () => api.axonautClearPendingInvoices(),
    onSuccess: (res) => {
      queryClient.setQueryData(["axonaut-invoices-pending"], {
        lastSyncAt: res.lastSyncAtAfter,
        blockedUntil: res.blockedUntil ?? null,
        pending: res.pending,
        invoices: res.invoices,
      });
      setAxonautMessage(res.cleared ? `${res.cleared} facture(s) retirée(s) de la liste.` : "Liste déjà vide.");
      setShowClearInvoicesModal(false);
    },
    onError: (err: Error) => setAxonautMessage(err.message),
  });

  const previewInvoices = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      const ids = Array.from(new Set((invoiceIds ?? []).map(String))).filter(Boolean);
      if (ids.length === 0) {
        throw new Error("Aucune facture Axonaut sélectionnée.");
      }
      const previews: AxonautInvoiceLines[] = [];
      for (const id of ids) {
        previews.push(await api.axonautGetInvoiceLines(id));
      }
      return previews;
    },
    onSuccess: (res) => {
      setAxonautMessage(null);
      setInvoicePreview(res);
    },
    onError: (err: Error) => setAxonautMessage(err.message),
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
      setAxonautMessage(
        `Import terminé : ${res.totalCreated} mouvements créés · ${res.totalSkipped} lignes ignorées${suffix}${errorsSuffix}${markSuffix}.`,
      );
      setInvoicePreview(null);
    },
    onError: (err: Error) => setAxonautMessage(err.message),
  });

  const stockQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["stock", product.id],
        queryFn: () => api.getStockForProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const inventoryQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["inventories", product.id],
        queryFn: () => api.getInventoriesByProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const thresholdMatches = useMemo(() => {
    const matches = products
      .map((product, index) => {
        const quantity = stockQueries[index]?.data?.stock;
        if (quantity === undefined) return null;
        const threshold = product.stockThreshold ?? 0;
        if (quantity > threshold) return null;
        return { product, quantity, threshold, deficit: threshold - quantity };
      })
      .filter(Boolean) as Array<{
      product: (typeof products)[number];
      quantity: number;
      threshold: number;
      deficit: number;
    }>;

    return matches.sort((a, b) => b.deficit - a.deficit);
  }, [products, stockQueries]);

  const stocksLoading = stockQueries.some((q) => q.isLoading);
  const underThresholdCount = thresholdMatches.length;
  const productsUnderThreshold = thresholdMatches.slice(0, 5);

  const inventoriesByProduct = useMemo(() => {
    const map = new Map<number, Inventory[]>();
    products.forEach((product, index) => {
      const data = inventoryQueries[index]?.data;
      if (data) {
        map.set(product.id, data as Inventory[]);
      }
    });
    return map;
  }, [inventoryQueries, products]);

  const valuationLocationOptions = useMemo(
    () => [
      { id: "all" as const, label: "Tous les emplacements", hint: "Global" },
      ...locations.map((loc) => ({ id: loc.id, label: loc.name, hint: loc.code })),
    ],
    [locations],
  );

  const filteredValuationLocationOptions = useMemo(
    () =>
      valuationLocationOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(valuationLocationSearch.toLowerCase()) ||
          (opt.hint?.toLowerCase().includes(valuationLocationSearch.toLowerCase()) ?? false),
      ),
    [valuationLocationOptions, valuationLocationSearch],
  );

  const valuationLocationLabel =
    valuationLocationId === "all"
      ? "Tous les emplacements"
      : locations.find((l) => l.id === valuationLocationId)?.name ?? `Emplacement #${valuationLocationId}`;

  const axonautPendingCount = pendingInvoices.data?.pending ?? 0;
  const axonautAutoSync = settings.axonautAutoSyncInvoices !== false;
  const displayedInvoices = (pendingInvoices.data?.invoices ?? []).slice(0, 6);
  const pendingBlockedUntil = pendingInvoices.data?.blockedUntil ?? null;

  const previewRows = useMemo(() => {
    if (!invoicePreview) return [];
    return invoicePreview.flatMap((item) =>
      (item.lines ?? []).map((line) => ({
        invoiceLabel: item.invoice.number ?? String(item.invoice.id),
        ...line,
      })),
    );
  }, [invoicePreview]);

  const startInvoicePreview = (invoiceIds: string[]) => {
    setAxonautMessage(null);
    previewInvoices.mutate(invoiceIds);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Tableau principal"
        title="Pilotage des flux en un coup de patte"
        icon={<img src={logo} alt="PetFlow" className="h-full w-full object-contain" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuickModal(true)}
              className="btn btn-primary"
              disabled={products.length === 0 || locations.length === 0}
            >
              Nouveau mouvement / inventaire
            </button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produits"
          value={loadingProducts ? "…" : products.length}
          hint="Catalogués"
          onClick={() => navigate("/products")}
        />
        <StatCard
          title="Emplacements"
          value={locations.length}
          hint="Actifs"
          onClick={() => navigate("/locations")}
        />
        <StatCard
          title="Sous le seuil"
          value={stocksLoading ? "…" : underThresholdCount}
          hint="Alertes stock"
          tone={!stocksLoading && underThresholdCount > 0 ? "warning" : "default"}
          onClick={() => navigate("/products")}
        />
        <StatCard
          title="Factures Axonaut"
          value={axonautConfig.isLoading ? "…" : axonautConfig.data?.hasApiKey ? (pendingInvoices.isLoading ? "…" : axonautPendingCount) : "—"}
          hint={axonautConfig.data?.hasApiKey ? "À importer" : "Non configuré"}
          tone={
            axonautConfig.data?.hasApiKey && !pendingInvoices.isLoading && axonautPendingCount > 0
              ? "warning"
              : "default"
          }
          onClick={() => navigate(axonautConfig.data?.hasApiKey ? "/documents" : "/settings")}
        />
      </div>

      {axonautConfig.data?.hasApiKey ? (
        <div className="panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-900">Factures Axonaut</h2>
                <span className="pill bg-ink-100 text-ink-700">
                  {axonautAutoSync ? "Synchro auto" : "Synchro manuelle"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-600">
                {pendingInvoices.data?.lastSyncAt
                  ? `Dernière synchro : ${new Date(pendingInvoices.data.lastSyncAt).toLocaleString("fr-FR")}`
                  : "Dernière synchro : —"}
                {pendingBlockedUntil
                  ? ` · Quota atteint : pause jusqu’au ${new Date(pendingBlockedUntil).toLocaleString("fr-FR")}`
                  : ""}
                {typeof axonautPendingCount === "number" ? ` · ${axonautPendingCount} à importer` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update({ axonautAutoSyncInvoices: true })}
                  className={["btn btn-xs", axonautAutoSync ? "btn-secondary" : "btn-muted"].join(" ")}
                  title="Synchronise automatiquement les factures Axonaut à la connexion"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => update({ axonautAutoSyncInvoices: false })}
                  className={["btn btn-xs", !axonautAutoSync ? "btn-secondary" : "btn-muted"].join(" ")}
                  title="Synchronisation uniquement manuelle (bouton)"
                >
                  Manuel
                </button>
              </div>

              <button
                type="button"
                onClick={() => syncInvoices.mutate()}
                className="btn btn-outline btn-sm"
                disabled={syncInvoices.isPending || Boolean(pendingBlockedUntil)}
              >
                {syncInvoices.isPending ? "Synchronisation…" : "Synchroniser maintenant"}
              </button>

              <button
                type="button"
                onClick={() => startInvoicePreview((pendingInvoices.data?.invoices ?? []).map((inv) => String(inv.id)))}
                className="btn btn-secondary btn-sm"
                disabled={
                  axonautPendingCount === 0 ||
                  previewInvoices.isPending ||
                  importInvoices.isPending ||
                  !defaultLocationId
                }
                title={defaultLocationId ? "Prévisualise puis importe toutes les factures." : "Créez un emplacement pour importer."}
              >
                {previewInvoices.isPending ? "Préparation…" : `Importer tout (${axonautPendingCount})`}
              </button>

              <button
                type="button"
                onClick={() => setShowClearInvoicesModal(true)}
                className="btn btn-muted btn-sm"
                disabled={axonautPendingCount === 0 || clearPendingInvoices.isPending}
                title="Vide la liste locale des factures en attente d'import (elles ne reviendront pas au prochain sync)."
              >
                Vider la liste
              </button>

              <button
                type="button"
                onClick={() => navigate("/documents")}
                className="btn btn-primary btn-sm"
              >
                Ouvrir l’import
              </button>
            </div>
          </div>

          {axonautMessage ? <p className="mt-3 text-sm text-ink-600">{axonautMessage}</p> : null}

          {pendingInvoices.isLoading ? (
            <p className="mt-3 text-sm text-ink-600">Chargement…</p>
          ) : axonautPendingCount === 0 ? (
            <p className="mt-3 text-sm text-ink-600">
              Aucune facture en attente.{" "}
              {axonautAutoSync
                ? "Elles seront récupérées automatiquement à la prochaine connexion."
                : "Cliquez sur “Synchroniser maintenant” pour vérifier."}
            </p>
          ) : (
            <div className="mt-3 overflow-auto rounded-lg border border-ink-100">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs text-ink-600">
                  <tr>
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 bg-white">
                  {displayedInvoices.map((inv) => (
                    <tr key={String(inv.id)}>
                      <td className="px-3 py-2 font-semibold text-ink-900">{inv.number ?? `#${inv.id}`}</td>
                      <td className="px-3 py-2 text-ink-700">{inv.customerName ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-700">
                        {inv.date ? new Date(inv.date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-3 py-2 text-ink-600">{inv.status ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startInvoicePreview([String(inv.id)])}
                          className="btn btn-xs btn-primary"
                          disabled={previewInvoices.isPending || importInvoices.isPending || !defaultLocationId}
                          title={
                            defaultLocationId
                              ? "Prévisualise puis importe cette facture."
                              : "Créez un emplacement pour importer."
                          }
                        >
                          {previewInvoices.isPending ? "Préparation…" : "Importer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {axonautPendingCount > displayedInvoices.length ? (
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => navigate("/documents")} className="btn btn-sm btn-outline">
                Voir tout ({axonautPendingCount})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showClearInvoicesModal ? (
        <ConfirmModal
          title="Vider la liste des factures Axonaut ?"
          description="Cette action supprime la liste locale des factures en attente d’import et avance la date de synchro à maintenant."
          onClose={() => (clearPendingInvoices.isPending ? null : setShowClearInvoicesModal(false))}
          onConfirm={() => clearPendingInvoices.mutate()}
          confirmLabel={clearPendingInvoices.isPending ? "Vidage…" : "Vider la liste"}
          confirmDisabled={clearPendingInvoices.isPending}
          cancelDisabled={clearPendingInvoices.isPending}
          canClose={!clearPendingInvoices.isPending}
        >
          <p className="text-sm text-ink-600">
            À utiliser si vous souhaitez repartir à zéro (les anciennes factures ne seront plus proposées à l’import).
          </p>
        </ConfirmModal>
      ) : null}

      {invoicePreview ? (
        <ConfirmModal
          title="Vérification des lignes Axonaut"
          description="Confirmez pour créer les mouvements de stock à partir des factures."
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="panel lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Valorisation du stock</h2>
              <p className="text-sm text-ink-500">30 derniers jours, calcul journalier en cache</p>
            </div>
            <div className="w-64">
              <SearchSelect
                label="Emplacement"
                placeholder="Rechercher un emplacement"
                valueId={valuationLocationId}
                search={valuationLocationSearch}
                onSearch={setValuationLocationSearch}
                options={filteredValuationLocationOptions}
                onSelect={(opt) => {
                  if (!opt) {
                    setValuationLocationId("all");
                    setValuationLocationSearch("Tous les emplacements");
                    return;
                  }
                  setValuationLocationId(opt.id === "all" ? "all" : Number(opt.id));
                  setValuationLocationSearch(opt.label);
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <StockValuationChart
              points={valuationPoints}
              loading={loadingValuations}
              locationLabel={valuationLocationLabel}
            />
          </div>
        </div>

        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Produits sous le seuil</h2>
              <p className="text-sm text-ink-500">Basé sur le seuil défini par produit</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="btn btn-sm btn-outline"
            >
              Voir tout
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {productsUnderThreshold.length === 0 ? (
              <p className="text-sm text-ink-600">
                {stocksLoading
                  ? "Chargement des stocks…"
                  : "Aucun produit sous le seuil. Définis un seuil dans la fiche produit si besoin."}
              </p>
            ) : (
              productsUnderThreshold.map(({ product, quantity, threshold, deficit }) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="card flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">
                      {product.sku} · Seuil {threshold}
                      {deficit > 0 ? ` · Manque ${deficit}` : ""}
                    </p>
                    {inventoriesByProduct.get(product.id)?.length ? null : <InventoryStatusBadge />}
                  </div>
                  <StockBadge quantity={quantity} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <MovementInventoryModal
        open={showQuickModal}
        onOpenChange={setShowQuickModal}
        products={products}
        locations={locations}
        subtitle="Saisie rapide depuis le tableau de bord"
        onCreated={() => navigate("/movements")}
      />
    </div>
  );
}

export default Dashboard;
