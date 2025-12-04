import { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSettings } from "../hooks/useSettings";

function Settings() {
  const { settings, update, reset, defaultColor } = useSettings();

  const pushAxonautConfig = useMutation({
    mutationFn: () =>
      api.axonautSetConfig({
        apiKey: settings.axonautApiKey || "",
      }),
  });

  const handleAxonautSync = (e: FormEvent) => {
    e.preventDefault();
    pushAxonautConfig.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Réglages généraux</h2>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700"
          >
            Réinitialiser
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-ink-700">
            Couleur principale
            <input
              type="color"
              value={settings.themeColor || defaultColor}
              onChange={(e) => update({ themeColor: e.target.value })}
              className="mt-1 h-10 w-24 rounded border border-ink-100"
            />
          </label>
          <label className="text-sm text-ink-700">
            URL API Core
            <input
              value={import.meta.env.VITE_API_URL || "http://localhost:3000"}
              readOnly
              className="mt-1 w-full rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs"
            />
          </label>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-ink-900">Connexion Husse</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-ink-700 md:col-span-2">
            URL de connexion
            <input
              value={settings.husseLoginUrl || ""}
              onChange={(e) => update({ husseLoginUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              placeholder="https://order.husse.fr/"
            />
          </label>
          <label className="text-sm text-ink-700">
            Email Husse
            <input
              value={settings.husseUsername || ""}
              onChange={(e) => update({ husseUsername: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="email"
            />
          </label>
          <label className="text-sm text-ink-700">
            Mot de passe Husse
            <input
              value={settings.hussePassword || ""}
              onChange={(e) => update({ hussePassword: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500">Ces valeurs restent en localStorage (non envoyées tant que vous n'appelez pas /husse/login).</p>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Axonaut</h3>
          <span className="pill bg-ink-100 text-ink-700">Auth via header userApiKey</span>
        </div>
        <form className="mt-3 space-y-3" onSubmit={handleAxonautSync}>
          <label className="text-sm text-ink-700">
            API Key Axonaut (header userApiKey)
            <input
              value={settings.axonautApiKey || ""}
              onChange={(e) => update({ axonautApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
            />
          </label>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-500">Les valeurs sont stockées localement. Cliquer sur “Envoyer au core” pousse la config sur /axonaut/config.</p>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              disabled={pushAxonautConfig.isPending}
            >
              {pushAxonautConfig.isPending ? "Envoi…" : "Envoyer au core"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
