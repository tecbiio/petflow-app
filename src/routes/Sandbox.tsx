import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSettings } from "../hooks/useSettings";

const maskKey = (value?: string) => {
  if (!value) return "non renseignée";
  if (value.length <= 6) return `${value[0]}***${value[value.length - 1]}`;
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

function Sandbox() {
  const { settings, update } = useSettings();
  const [reference, setReference] = useState("");
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);
  const [lookupRequest, setLookupRequest] = useState<Record<string, unknown> | null>(null);
  const [pushRequest, setPushRequest] = useState<Record<string, unknown> | null>(null);
  const [pushResponse, setPushResponse] = useState<unknown>(null);
  const [testUrl, setTestUrl] = useState<string>("");
  const [testMethod, setTestMethod] = useState<"GET" | "POST" | "PATCH">("GET");
  const [testBody, setTestBody] = useState<string>("{}");
  const [testReq, setTestReq] = useState<Record<string, unknown> | null>(null);
  const [testRes, setTestRes] = useState<unknown>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const coreConfigQuery = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });

  const pushConfig = useMutation({
    mutationFn: () => {
      const payload = {
        apiKey: settings.axonautApiKey || "",
        husseUsername: settings.husseUsername || "",
        hussePassword: settings.hussePassword || "",
      };
      setPushRequest(payload);
      setPushResponse(null);
      return api.axonautSetConfig(payload);
    },
    onSuccess: (res) => {
      setPushResponse(res);
      coreConfigQuery.refetch();
    },
  });

  const lookup = useMutation({
    mutationFn: () => {
      const req = { references: [reference.trim()] };
      setLookupRequest(req);
      setLookupResult(null);
      return api.axonautLookup(req.references);
    },
    onSuccess: (data) => setLookupResult(data),
  });

  const testRequest = useMutation({
    mutationFn: () => {
      setTestError(null);
      setTestRes(null);
      let parsedBody: unknown = undefined;
      if (testMethod !== "GET" && testBody.trim()) {
        try {
          parsedBody = JSON.parse(testBody);
        } catch (err) {
          setTestError("Body invalide (JSON)");
          throw err;
        }
      }
      const payload = { url: testUrl, method: testMethod, body: parsedBody };
      setTestReq(payload);
      return api.axonautTestRequest(payload);
    },
    onSuccess: (data) => setTestRes(data),
    onError: (err) => {
      if (!testError) setTestError((err as Error).message);
    },
  });

  const handleSaveKey = (e: FormEvent) => {
    e.preventDefault();
    if (pushConfig.isPending) return;
    pushConfig.mutate();
  };

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    setLookupResult(null);
    if (!reference.trim()) return;
    lookup.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Axonaut</p>
            <h2 className="text-lg font-semibold text-ink-900">Bac à sable</h2>
            <p className="text-sm text-ink-600">Vérifie la config envoyée au core et teste un lookup produit.</p>
          </div>
          <span className="pill bg-ink-100 text-ink-700">Debug</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-ink-900">1. Config locale</h3>
          <form className="space-y-3" onSubmit={handleSaveKey}>
            <label className="text-sm text-ink-700">
              API Key Axonaut (header userApiKey)
              <input
                value={settings.axonautApiKey || ""}
                onChange={(e) => update({ axonautApiKey: e.target.value })}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                type="password"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              disabled={pushConfig.isPending}
            >
              {pushConfig.isPending ? "Envoi…" : "Envoyer au core"}
            </button>
          </form>
          {pushConfig.isError ? (
            <p className="text-xs text-amber-700">{(pushConfig.error as Error).message}</p>
          ) : null}
          {pushConfig.isSuccess ? (
            <p className="text-xs text-emerald-700">Config poussée, relecture en cours…</p>
          ) : null}
          <div className="space-y-2 text-xs text-ink-700">
            <p className="font-semibold text-ink-800">Requête envoyée</p>
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-2">
              <pre className="whitespace-pre-wrap break-all">
                {pushRequest ? JSON.stringify(pushRequest, null, 2) : "—"}
              </pre>
            </div>
            <p className="font-semibold text-ink-800">Réponse core</p>
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-2">
              <pre className="whitespace-pre-wrap break-all">
                {pushResponse ? JSON.stringify(pushResponse, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-ink-900">2. Config reçue par le core</h3>
          {coreConfigQuery.isLoading ? (
            <p className="text-sm text-ink-600">Chargement…</p>
          ) : (
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(coreConfigQuery.data ?? null, null, 2)}
              </pre>
            </div>
          )}
          <button
            type="button"
            onClick={() => coreConfigQuery.refetch()}
            className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          >
            Rafraîchir la config
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">3. Tester un lookup</h3>
          <span className="pill bg-ink-100 text-ink-700">/axonaut/lookup</span>
        </div>
        <form className="flex flex-col gap-2 md:flex-row" onSubmit={handleLookup}>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
            placeholder="Référence à tester"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            disabled={!reference.trim() || lookup.isPending}
          >
            {lookup.isPending ? "Lookup…" : "Tester"}
          </button>
        </form>
        {lookup.isError ? (
          <p className="text-xs text-amber-700">{(lookup.error as Error).message}</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
            <p className="mb-1 font-semibold text-ink-800">Requête</p>
            <pre className="whitespace-pre-wrap break-all">
              {lookupRequest ? JSON.stringify(lookupRequest, null, 2) : "—"}
            </pre>
          </div>
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
            <p className="mb-1 font-semibold text-ink-800">Réponse</p>
            <pre className="whitespace-pre-wrap break-all">
              {lookupResult ? JSON.stringify(lookupResult, null, 2) : "—"}
            </pre>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">4. Requête libre Axonaut (via core)</h3>
          <span className="pill bg-ink-100 text-ink-700">Headers userApiKey auto</span>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); testRequest.mutate(); }}>
          <div className="grid gap-3 md:grid-cols-[1fr,140px]">
            <label className="text-sm text-ink-700">
              URL complète
              <input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                placeholder="https://axonaut.com/api/v2/products"
              />
            </label>
            <label className="text-sm text-ink-700">
              Méthode
              <select
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value as "GET" | "POST" | "PATCH")}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
          </div>
          {testMethod !== "GET" ? (
            <label className="text-sm text-ink-700">
              Body (JSON)
              <textarea
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm font-mono"
                rows={4}
              />
            </label>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              disabled={testRequest.isPending || !testUrl.trim()}
            >
              {testRequest.isPending ? "Envoi…" : "Envoyer"}
            </button>
            {testError ? <p className="text-xs text-amber-700">{testError}</p> : null}
          </div>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
            <p className="mb-1 font-semibold text-ink-800">Requête</p>
            <pre className="whitespace-pre-wrap break-all">
              {testReq
                ? JSON.stringify(
                    {
                      ...testReq,
                      headers: {
                        userApiKey: maskKey(settings.axonautApiKey),
                      },
                    },
                    null,
                    2,
                  )
                : "—"}
            </pre>
          </div>
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
            <p className="mb-1 font-semibold text-ink-800">Réponse</p>
            <pre className="whitespace-pre-wrap break-all">
              {testRes ? JSON.stringify(testRes, null, 2) : "—"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sandbox;
