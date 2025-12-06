import { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "../components/ToastProvider";

function Settings() {
  const { settings, update, reset, defaultColor } = useSettings();
  const toast = useToast();

  const pushAxonautConfig = useMutation({
    mutationFn: () =>
      api.axonautSetConfig({
        apiKey: settings.axonautApiKey || "",
        husseUsername: settings.husseUsername || "",
        hussePassword: settings.hussePassword || "",
      }),
    onSuccess: () => {
      toast("Paramètres sauvegardés", "success");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const handleSaveAll = (e: FormEvent) => {
    e.preventDefault();
    pushAxonautConfig.mutate();
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
        <h3 className="text-sm font-semibold text-ink-900">Extranet Husse</h3>
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
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-ink-900">API Axonaut</h3>
        <form className="mt-3 space-y-3" onSubmit={handleSaveAll}>
          <label className="text-sm text-ink-700">
            Clé API
            <input
              value={settings.axonautApiKey || ""}
              onChange={(e) => markChange({ axonautApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
            />
          </label>
        </form>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          disabled={pushAxonautConfig.isPending}
        >
          {pushAxonautConfig.isPending ? "Sauvegarde…" : "Sauvegarder tous les réglages"}
        </button>
      </div>
    </div>
  );
}

export default Settings;
