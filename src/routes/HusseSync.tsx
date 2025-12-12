import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import PageHeader from "../components/ui/PageHeader";

const DEFAULT_BASE_URL = "https://order.husse.fr/";

function HusseSync() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [urlTextarea, setUrlTextarea] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pages, setPages] = useState<{ url: string; html: string }[]>([]);

  const parsedUrls = useMemo(
    () =>
      urlTextarea
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [urlTextarea],
  );

  const login = useMutation({
    mutationFn: () => api.husseLogin(baseUrl, username, password),
    onSuccess: () => setMessage("Connecté à l'extranet Husse (cookie stocké en mémoire serveur)."),
    onError: (error: Error) => setMessage(error.message),
  });

  const fetchPages = useMutation({
    mutationFn: () => api.husseFetch(parsedUrls),
    onSuccess: (data) => {
      setPages(data.pages);
      setMessage(
        data.encounteredLoginPage
          ? "Pages récupérées, mais l'une ressemble à une page de login (session expirée ?)."
          : `Pages récupérées : ${data.pages.length}`,
      );
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    login.mutate();
  };

  const handleFetch = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (parsedUrls.length === 0) {
      setMessage("Ajoutez au moins une URL de produit/catégorie.");
      return;
    }
    fetchPages.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Husse" subtitle="Session et récupération de pages (debug)." />
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Session Husse</h2>
          <span className="pill bg-brand-50 text-brand-700">Cookie en mémoire côté core</span>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleLogin}>
          <label className="text-sm text-ink-700">
            URL de connexion
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              placeholder="https://order.husse.fr/"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2 md:col-span-1">
            <label className="text-sm text-ink-700">
              Email
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                type="email"
              />
            </label>
            <label className="text-sm text-ink-700">
              Mot de passe
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                type="password"
              />
            </label>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            {message ? <p className="text-xs text-ink-600">{message}</p> : <p className="text-xs text-ink-500">POST /husse/login – récupère Set-Cookie et le réutilise sur /husse/fetch</p>}
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              disabled={login.isPending}
            >
              {login.isPending ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Récupérer des pages produits</h3>
          <span className="pill bg-ink-100 text-ink-700">POST /husse/fetch</span>
        </div>
        <form className="mt-3 space-y-3" onSubmit={handleFetch}>
          <label className="text-sm text-ink-700">
            URLs (une par ligne)
            <textarea
              value={urlTextarea}
              onChange={(e) => setUrlTextarea(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 font-mono text-xs"
              rows={6}
              placeholder="https://order.husse.fr/produits/xxx"
            />
          </label>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-500">Le core renvoie les HTML (pas de parsage côté front pour l’instant).</p>
            <button
              type="submit"
              className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              disabled={fetchPages.isPending}
            >
              {fetchPages.isPending ? "Récupération…" : "Récupérer"}
            </button>
          </div>
        </form>
        {pages.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-ink-600">Pages téléchargées ({pages.length}) :</p>
            <div className="rounded-lg border border-ink-100 bg-white p-3 text-xs text-ink-700 max-h-64 overflow-auto">
              {pages.map((page) => (
                <details key={page.url} className="mb-2">
                  <summary className="cursor-pointer font-semibold text-ink-800">{page.url}</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words">{page.html.slice(0, 1500)}{page.html.length > 1500 ? "… (tronqué)" : ""}</pre>
                </details>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default HusseSync;
