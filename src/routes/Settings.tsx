import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "../components/ToastProvider";
import { useFamilies } from "../hooks/useFamilies";
import { usePackagings } from "../hooks/usePackagings";
import SearchSelect from "../components/SearchSelect";
import ConfirmModal from "../components/ConfirmModal";
import PageHeader from "../components/ui/PageHeader";

function Settings() {
  const { settings, update, reset, defaultColor } = useSettings();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [newFamily, setNewFamily] = useState("");
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState("");
  const [newSubFamily, setNewSubFamily] = useState("");
  const [newSubFamilyFamilyId, setNewSubFamilyFamilyId] = useState<number | null>(null);
  const [newSubFamilyFamilySearch, setNewSubFamilyFamilySearch] = useState("");
  const [editingSubFamilyId, setEditingSubFamilyId] = useState<number | null>(null);
  const [editingSubFamilyName, setEditingSubFamilyName] = useState("");
  const [editingSubFamilyFamilyId, setEditingSubFamilyFamilyId] = useState<number | null>(null);
  const [editingSubFamilyFamilySearch, setEditingSubFamilyFamilySearch] = useState("");
  const [newPackagingName, setNewPackagingName] = useState("");
  const [editingPackagingId, setEditingPackagingId] = useState<number | null>(null);
  const [editingPackagingName, setEditingPackagingName] = useState("");
  const [axonautSyncIds, setAxonautSyncIds] = useState("");
  const [axonautSyncResult, setAxonautSyncResult] = useState<unknown>(null);

  const axonautConfig = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });
  const husseConfig = useQuery({
    queryKey: ["husse-config"],
    queryFn: () => api.husseGetConfig(),
  });
  const familiesQuery = useFamilies();
  const packagingsQuery = usePackagings();

  const saveSettings = useMutation({
    mutationFn: async () => {
      const tasks: Promise<unknown>[] = [];
      const axonautKey = settings.axonautApiKey?.trim();
      const hasRemoteAxonautKey = axonautConfig.data?.hasApiKey === true;
      const shouldPushAxonaut = Boolean(axonautKey) || !hasRemoteAxonautKey;

      if (shouldPushAxonaut) {
        if (!axonautKey) {
          throw new Error("Ajoutez la clé API Axonaut avant de sauvegarder.");
        }
        tasks.push(api.axonautSetConfig({ apiKey: axonautKey }));
      }

      const husseUsername = settings.husseUsername?.trim();
      const hussePassword = settings.hussePassword?.trim();
      if (husseUsername && hussePassword) {
        tasks.push(api.husseSetConfig({ username: husseUsername, password: hussePassword }));
      }

      if (tasks.length === 0) {
        throw new Error("Aucun paramètre à sauvegarder.");
      }

      await Promise.all(tasks);
    },
    onSuccess: () => {
      toast("Paramètres sauvegardés", "success");
      axonautConfig.refetch();
      husseConfig.refetch();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const importHusseProducts = useMutation({
    mutationFn: () =>
      api.husseImportProducts({
        username: settings.husseUsername || undefined,
        password: settings.hussePassword || undefined,
      }),
    onSuccess: (res) => {
      const details = [`${res.total} produits`, `${res.created} créés`, `${res.updated} mis à jour`].join(" · ");
      const suffix = res.encounteredLoginPage ? " (page de connexion détectée)" : "";
      toast(`Import Husse terminé : ${details}${suffix}.`, res.encounteredLoginPage ? "warning" : "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const importAxonautProducts = useMutation({
    mutationFn: () => api.axonautImportProducts(),
    onSuccess: (res) => {
      const details = [`${res.total} produits`, `${res.created} créés`, `${res.updated} mis à jour`].join(" · ");
      toast(
        `Import Axonaut terminé : ${details}${res.packagingCreated ? ` · ${res.packagingCreated} conditionnements` : ""}`,
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["packagings"] });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["sub-families"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const syncAxonautStock = useMutation({
    mutationFn: () => {
      const ids = axonautSyncIds
        .split(/[\s,;]+/g)
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0);
      if (ids.length === 0) {
        throw new Error("Renseignez au moins un id produit (entier positif).");
      }
      setAxonautSyncResult(null);
      return api.axonautSyncStock({ productIds: ids });
    },
    onSuccess: (res) => {
      setAxonautSyncResult(res);
      toast(`Synchro stock Axonaut : ${res.updated} OK · ${res.skipped} ignorés`, "success");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const syncAxonautStockAllLinked = useMutation({
    mutationFn: async () => {
      const products = await api.listProducts();
      const ids = products
        .filter((p) => p.axonautProductId !== null && p.axonautProductId !== undefined)
        .map((p) => p.id);
      if (ids.length === 0) {
        throw new Error("Aucun produit lié à Axonaut (axonautProductId manquant).");
      }
      setAxonautSyncResult(null);
      return api.axonautSyncStock({ productIds: ids });
    },
    onSuccess: (res) => {
      setAxonautSyncResult(res);
      toast(
        `Synchro stock Axonaut (tous les produits liés) : ${res.updated} OK · ${res.skipped} ignorés`,
        "success",
      );
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const handleSaveAll = (e: FormEvent) => {
    e.preventDefault();
    if (saveSettings.isPending) return;
    saveSettings.mutate();
  };

  const markChange = (patch: Partial<typeof settings>) => {
    update(patch);
  };

  const familyOptions = useMemo(
    () => (familiesQuery.data ?? []).map((f) => ({ id: f.id, label: f.name })),
    [familiesQuery.data],
  );

  const createFamilyMutation = useMutation({
    mutationFn: (name: string) => api.createFamily(name),
    onSuccess: () => {
      toast("Famille créée", "success");
      setNewFamily("");
      familiesQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["sub-families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateFamilyMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateFamily(id, name),
    onSuccess: () => {
      toast("Famille mise à jour", "success");
      setEditingFamilyId(null);
      setEditingFamilyName("");
      familiesQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["sub-families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const createSubFamilyMutation = useMutation({
    mutationFn: ({ familyId, name }: { familyId: number; name: string }) => api.createSubFamily(familyId, name),
    onSuccess: () => {
      toast("Sous-famille créée", "success");
      setNewSubFamily("");
      setNewSubFamilyFamilySearch("");
      familiesQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["sub-families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateSubFamilyMutation = useMutation({
    mutationFn: ({ id, name, familyId }: { id: number; name?: string; familyId?: number }) =>
      api.updateSubFamily(id, { name, familyId }),
    onSuccess: () => {
      toast("Sous-famille mise à jour", "success");
      setEditingSubFamilyId(null);
      setEditingSubFamilyName("");
      setEditingSubFamilyFamilyId(null);
      familiesQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["sub-families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const createPackagingMutation = useMutation({
    mutationFn: (name: string) => api.createPackaging(name),
    onSuccess: () => {
      toast("Conditionnement créé", "success");
      setNewPackagingName("");
      packagingsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["packagings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updatePackagingMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updatePackaging(id, name),
    onSuccess: () => {
      toast("Conditionnement mis à jour", "success");
      setEditingPackagingId(null);
      setEditingPackagingName("");
      packagingsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["packagings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Réglages" subtitle="Intégrations, catalogues et référentiels." />
      <div className="panel">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-900">Extranet Husse</h3>
          {husseConfig.data?.hasCredentials ? (
            <span className="pill bg-emerald-50 text-emerald-700">Identifiants enregistrés</span>
          ) : (
            <span className="pill bg-ink-50 text-ink-700">Identifiants non enregistrés</span>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-ink-700 relative">
            Email Husse
            <input
              value={settings.husseUsername || ""}
              onChange={(e) => markChange({ husseUsername: e.target.value })}
              className="mt-1 input"
              type="email"
              placeholder={husseConfig.data?.hasCredentials ? "••••••••" : undefined}
            />
          </label>
          <label className="text-sm text-ink-700 relative">
            Mot de passe Husse
            <input
              value={settings.hussePassword || ""}
              onChange={(e) => markChange({ hussePassword: e.target.value })}
              className="mt-1 input"
              type="password"
              placeholder={husseConfig.data?.hasCredentials ? "••••••••" : undefined}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmImportOpen(true)}
            className="btn btn-outline"
            disabled={importHusseProducts.isPending}
          >
            {importHusseProducts.isPending ? "Import en cours…" : "Importer les produits depuis l'extranet Husse"}
          </button>
          {!husseConfig.data?.hasCredentials ? (
            <span className="text-xs text-amber-700">Ajoutez des identifiants Husse pour activer l'import.</span>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-900">API Axonaut</h3>
          {axonautConfig.data?.hasApiKey ? (
            <span className="pill bg-emerald-50 text-emerald-700">Clé enregistrée</span>
          ) : (
            <span className="pill bg-ink-50 text-ink-700">Aucune clé enregistrée</span>
          )}
        </div>
        <form className="mt-3 space-y-3" onSubmit={handleSaveAll}>
          <label className="text-sm text-ink-700 relative">
            Clé API
            <input
              value={settings.axonautApiKey || ""}
              onChange={(e) => markChange({ axonautApiKey: e.target.value })}
              className="mt-1 input"
              type="password"
              placeholder={axonautConfig.data?.hasApiKey ? "••••••••••••" : undefined}
            />
          </label>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => importAxonautProducts.mutate()}
            className="btn btn-outline"
            disabled={importAxonautProducts.isPending || !axonautConfig.data?.hasApiKey}
          >
            {importAxonautProducts.isPending ? "Import en cours…" : "Importer les produits depuis Axonaut"}
          </button>
          {!axonautConfig.data?.hasApiKey ? (
            <span className="text-xs text-amber-700">Ajoutez une clé Axonaut pour activer l'import.</span>
          ) : null}
        </div>

        <div className="mt-4 border-t border-ink-100 pt-4">
          <h4 className="text-sm font-semibold text-ink-900">Synchroniser le stock vers Axonaut</h4>
          <p className="mt-1 text-xs text-ink-600">
            Met à jour le stock Axonaut à partir du stock calculé dans Petflow (ids produits séparés par virgule/espace).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={axonautSyncIds}
              onChange={(e) => setAxonautSyncIds(e.target.value)}
              className="input flex-1"
              placeholder="Ex: 12, 15, 32"
            />
            <button
              type="button"
              onClick={() => syncAxonautStock.mutate()}
              className="btn btn-secondary"
              disabled={syncAxonautStock.isPending || axonautConfig.data?.hasApiKey !== true}
              title={axonautConfig.data?.hasApiKey !== true ? "Ajoutez une clé Axonaut pour activer." : undefined}
            >
              {syncAxonautStock.isPending ? "Synchro…" : "Synchroniser"}
            </button>
            <button
              type="button"
              onClick={() => syncAxonautStockAllLinked.mutate()}
              className="btn btn-outline"
              disabled={syncAxonautStockAllLinked.isPending || axonautConfig.data?.hasApiKey !== true}
              title={axonautConfig.data?.hasApiKey !== true ? "Ajoutez une clé Axonaut pour activer." : undefined}
            >
              {syncAxonautStockAllLinked.isPending ? "Synchro…" : "Tout synchroniser"}
            </button>
          </div>
          {axonautSyncResult ? (
            <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(axonautSyncResult, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          className="btn btn-primary"
          disabled={saveSettings.isPending || axonautConfig.isLoading || husseConfig.isLoading}
        >
          {saveSettings.isPending ? "Sauvegarde…" : "Sauvegarder tous les réglages"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Familles</h3>
            <span className="text-xs text-ink-500">{familiesQuery.data?.length ?? 0} items</span>
          </div>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <input
                value={newFamily}
                onChange={(e) => setNewFamily(e.target.value)}
                className="input"
                placeholder="Nouvelle famille"
              />
              <button
                type="button"
                onClick={() => newFamily.trim() && createFamilyMutation.mutate(newFamily.trim())}
                className="btn btn-primary btn-sm"
                disabled={createFamilyMutation.isPending}
              >
                Ajouter
              </button>
            </div>
            <div className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white max-h-80 overflow-y-auto">
              {(familiesQuery.data ?? []).map((fam) => (
                <div key={fam.id} className="flex items-center gap-2 px-3 py-2">
                  {editingFamilyId === fam.id ? (
                    <>
                      <input
                        value={editingFamilyName}
                        onChange={(e) => setEditingFamilyName(e.target.value)}
                        className="w-full rounded-lg border border-ink-100 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                        onClick={() =>
                          editingFamilyName.trim() &&
                          updateFamilyMutation.mutate({ id: fam.id, name: editingFamilyName.trim() })
                        }
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                        onClick={() => {
                          setEditingFamilyId(null);
                          setEditingFamilyName("");
                        }}
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-ink-900">{fam.name}</span>
                      <button
                        type="button"
                        className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                        onClick={() => {
                          setEditingFamilyId(fam.id);
                          setEditingFamilyName(fam.name);
                        }}
                      >
                        Renommer
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Sous-familles</h3>
            <span className="text-xs text-ink-500">
              {(familiesQuery.data ?? []).reduce((acc, f) => acc + (f.subFamilies?.length ?? 0), 0)}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <SearchSelect
                label="Famille"
                placeholder="Choisir une famille"
                valueId={newSubFamilyFamilyId ?? undefined}
                search={newSubFamilyFamilySearch}
                onSearch={setNewSubFamilyFamilySearch}
                options={familyOptions}
                onSelect={(opt) => {
                  setNewSubFamilyFamilyId(opt ? Number(opt.id) : null);
                  setNewSubFamilyFamilySearch(opt?.label ?? "");
                }}
              />
              <label className="text-sm text-ink-700">
                Nouvelle sous-famille
                <input
                  value={newSubFamily}
                  onChange={(e) => setNewSubFamily(e.target.value)}
                  className="mt-1 input"
                  placeholder="Sous-famille"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newSubFamilyFamilyId || !newSubFamily.trim()) return;
                createSubFamilyMutation.mutate({ familyId: newSubFamilyFamilyId, name: newSubFamily.trim() });
              }}
              className="btn btn-primary btn-sm"
              disabled={createSubFamilyMutation.isPending || !newSubFamilyFamilyId || !newSubFamily.trim()}
            >
              {createSubFamilyMutation.isPending ? "Ajout…" : "Ajouter"}
            </button>

            <div className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white max-h-80 overflow-y-auto">
              {(familiesQuery.data ?? []).flatMap((fam) =>
                fam.subFamilies?.map((sub) => (
                  <div key={sub.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="pill bg-ink-50 text-ink-700">{fam.name}</span>
                    {editingSubFamilyId === sub.id ? (
                      <>
                        <input
                          value={editingSubFamilyName}
                          onChange={(e) => setEditingSubFamilyName(e.target.value)}
                          className="w-full rounded-lg border border-ink-100 px-2 py-1 text-sm"
                        />
                        <SearchSelect
                          placeholder="Famille"
                          valueId={editingSubFamilyFamilyId ?? fam.id}
                          search={
                            editingSubFamilyFamilySearch ||
                            (familyOptions.find((f) => f.id === (editingSubFamilyFamilyId ?? fam.id))?.label ?? "")
                          }
                          onSearch={setEditingSubFamilyFamilySearch}
                          options={familyOptions}
                          onSelect={(opt) => {
                            setEditingSubFamilyFamilyId(opt ? Number(opt.id) : null);
                            setEditingSubFamilyFamilySearch(opt?.label ?? "");
                          }}
                        />
                        <button
                          type="button"
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                          onClick={() =>
                            updateSubFamilyMutation.mutate({
                              id: sub.id,
                              name: editingSubFamilyName || sub.name,
                              familyId: editingSubFamilyFamilyId ?? fam.id,
                            })
                          }
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                          onClick={() => {
                            setEditingSubFamilyId(null);
                            setEditingSubFamilyFamilyId(null);
                            setEditingSubFamilyName("");
                            setEditingSubFamilyFamilySearch("");
                          }}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-ink-900">{sub.name}</span>
                        <button
                          type="button"
                          className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                          onClick={() => {
                            setEditingSubFamilyId(sub.id);
                            setEditingSubFamilyName(sub.name);
                            setEditingSubFamilyFamilyId(fam.id);
                            setEditingSubFamilyFamilySearch(fam.name);
                          }}
                        >
                          Editer
                        </button>
                      </>
                    )}
                  </div>
                )) ?? [],
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Conditionnements</h3>
          <span className="text-xs text-ink-500">{packagingsQuery.data?.length ?? 0}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newPackagingName}
            onChange={(e) => setNewPackagingName(e.target.value)}
            className="input"
            placeholder="Nouveau conditionnement"
          />
          <button
            type="button"
            onClick={() => newPackagingName.trim() && createPackagingMutation.mutate(newPackagingName.trim())}
            className="btn btn-primary btn-sm"
            disabled={createPackagingMutation.isPending}
          >
            Ajouter
          </button>
        </div>
        <div className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
          {(packagingsQuery.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2">
              {editingPackagingId === p.id ? (
                <>
                  <input
                    value={editingPackagingName}
                    onChange={(e) => setEditingPackagingName(e.target.value)}
                    className="w-full rounded-lg border border-ink-100 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                    onClick={() =>
                      editingPackagingName.trim() &&
                      updatePackagingMutation.mutate({ id: p.id, name: editingPackagingName.trim() })
                    }
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                    onClick={() => {
                      setEditingPackagingId(null);
                      setEditingPackagingName("");
                    }}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-ink-900">{p.name}</span>
                  <button
                    type="button"
                    className="rounded bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                    onClick={() => {
                      setEditingPackagingId(p.id);
                      setEditingPackagingName(p.name);
                    }}
                  >
                    Renommer
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {confirmImportOpen ? (
        <ConfirmModal
          title="Importer le catalogue Husse ?"
          description="Le core va se connecter à l’extranet Husse avec les identifiants renseignés et rafraîchir les produits (familles, sous-familles, prix)."
          onClose={() => setConfirmImportOpen(false)}
          onConfirm={() => {
            setConfirmImportOpen(false);
            importHusseProducts.mutate();
          }}
          canClose={!importHusseProducts.isPending}
          cancelDisabled={importHusseProducts.isPending}
          confirmDisabled={importHusseProducts.isPending}
          confirmLabel={importHusseProducts.isPending ? "Import…" : "Confirmer l'import"}
        />
      ) : null}
    </div>
  );
}

export default Settings;
