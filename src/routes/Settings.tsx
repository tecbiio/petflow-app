import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "../components/ToastProvider";

function Settings() {
  const { settings, update, reset, defaultColor } = useSettings();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  const axonautConfig = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });
  const husseConfig = useQuery({
    queryKey: ["husse-config"],
    queryFn: () => api.husseGetConfig(),
  });

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

  const handleSaveAll = (e: FormEvent) => {
    e.preventDefault();
    if (saveSettings.isPending) return;
    saveSettings.mutate();
  };

  const markChange = (patch: Partial<typeof settings>) => {
    update(patch);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Les identifiants sensibles ne sont plus persistés dans le navigateur : ils restent en mémoire le temps de la session et sont envoyés au core lors de la sauvegarde.
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-900">Extranet Husse</h3>
          {husseConfig.data?.hasCredentials ? (
            <span className="pill bg-emerald-50 text-emerald-700">Identifiants enregistrés côté core</span>
          ) : (
            <span className="pill bg-ink-50 text-ink-700">Identifiants non enregistrés</span>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-ink-700">
            Email Husse
            <input
              value={settings.husseUsername || ""}
              onChange={(e) => markChange({ husseUsername: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="email"
            />
          </label>
          <label className="text-sm text-ink-700">
            Mot de passe Husse
            <input
              value={settings.hussePassword || ""}
              onChange={(e) => markChange({ hussePassword: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-600">Les URL produits Husse restent côté core. Un login est fait avant chaque import.</p>
          <button
            type="button"
            onClick={() => setConfirmImportOpen(true)}
            className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:-translate-y-0.5 hover:shadow-card"
            disabled={importHusseProducts.isPending}
          >
            {importHusseProducts.isPending ? "Import en cours…" : "Importer les produits depuis l'extranet"}
          </button>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-900">API Axonaut</h3>
          {axonautConfig.data?.hasApiKey ? (
            <span className="pill bg-emerald-50 text-emerald-700">Clé enregistrée dans le core</span>
          ) : (
            <span className="pill bg-ink-50 text-ink-700">Aucune clé côté core</span>
          )}
        </div>
        <form className="mt-3 space-y-3" onSubmit={handleSaveAll}>
          <label className="text-sm text-ink-700">
            Clé API
            <input
              value={settings.axonautApiKey || ""}
              onChange={(e) => markChange({ axonautApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
              placeholder={axonautConfig.data?.hasApiKey ? "Clé déjà configurée côté core" : undefined}
            />
            {axonautConfig.data?.hasApiKey ? (
              <p className="mt-1 text-xs text-ink-600">Une clé est déjà stockée côté core, vous pouvez la remplacer en la ressaisissant.</p>
            ) : null}
          </label>
        </form>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          disabled={saveSettings.isPending || axonautConfig.isLoading || husseConfig.isLoading}
        >
          {saveSettings.isPending ? "Sauvegarde…" : "Sauvegarder tous les réglages"}
        </button>
      </div>
      {confirmImportOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[4000] flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-sm"
              onClick={() => (importHusseProducts.isPending ? null : setConfirmImportOpen(false))}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="text-lg font-semibold text-ink-900">Importer le catalogue Husse ?</h4>
                <p className="mt-2 text-sm text-ink-600">
                  Le core va se connecter à l’extranet Husse avec les identifiants renseignés et rafraîchir les produits (familles, sous-familles, prix).
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800"
                    onClick={() => setConfirmImportOpen(false)}
                    disabled={importHusseProducts.isPending}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                    disabled={importHusseProducts.isPending}
                    onClick={() => {
                      setConfirmImportOpen(false);
                      importHusseProducts.mutate();
                    }}
                  >
                    {importHusseProducts.isPending ? "Import…" : "Confirmer l'import"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default Settings;
