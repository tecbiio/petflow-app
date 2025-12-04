import { FormEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";

function Locations() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const { data: locations = [] } = useStockLocations({ active: activeOnly ? true : undefined });
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const createLocation = useMutation({
    mutationFn: api.createStockLocation,
    onSuccess: (created) => {
      setMessage(`Emplacement créé via PUT /stock-locations (#${created.id})`);
      setName("");
      setCode("");
      setIsActive(true);
      setIsDefault(false);
      queryClient.invalidateQueries({ queryKey: ["stockLocations"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const updateLocation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { isDefault?: boolean; isActive?: boolean } }) =>
      api.updateStockLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockLocations"] });
      setMessage("Mise à jour via PATCH /stock-locations/:id");
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name || !code) {
      setMessage("Nom et code sont requis.");
      return;
    }
    setMessage(null);
    createLocation.mutate({ name, code, isDefault, isActive });
  };

  const currentDefaultId = useMemo(() => locations.find((loc) => loc.isDefault)?.id, [locations]);

  const filtered = useMemo(
    () =>
      locations.filter(
        (loc) =>
          loc.name.toLowerCase().includes(search.toLowerCase()) ||
          loc.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [locations, search],
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-lg font-semibold text-ink-900">Emplacements</p>
          <p className="text-xs text-ink-500">Gestion des zones de stockage et emplacements par défaut.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setShowCreateModal(true);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
        >
          Nouvel emplacement
        </button>
      </div>

      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou code"
            className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm shadow-sm md:w-72"
          />
          <button
            type="button"
          onClick={() => setActiveOnly((prev) => !prev)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            activeOnly ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700"
          }`}
        >
          {activeOnly ? "Actifs" : "Tous"}
        </button>
        </div>
        <span className="text-sm font-semibold text-ink-700">{filtered.length} résultats</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((loc) => (
          <div
            key={loc.id}
            className={`glass-panel flex items-center justify-between rounded-xl border px-3 py-3 shadow-card ${
              loc.isDefault ? "border-brand-200" : "border-ink-100"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-ink-900">{loc.name}</p>
              <p className="text-xs text-ink-500">{loc.code || "—"}</p>
              <p className="text-[11px] text-ink-500">
                Statut : {loc.isActive ?? true ? "Actif" : "Inactif"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => updateLocation.mutate({ id: loc.id, payload: { isDefault: true } })}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  loc.isDefault ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"
                }`}
                disabled={updateLocation.isPending}
              >
                {loc.isDefault ? "Par défaut" : "Définir défaut"}
              </button>
              <button
                type="button"
                onClick={() => updateLocation.mutate({ id: loc.id, payload: { isActive: !(loc.isActive ?? true) } })}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700 shadow-sm"
                disabled={updateLocation.isPending}
              >
                {loc.isActive ?? true ? "Désactiver" : "Réactiver"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            >
              <div
                className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-900">Nouvel emplacement</h3>
                    <p className="text-xs text-ink-500">Définis un nom, un code et son statut.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
                  >
                    Fermer
                  </button>
                </div>
                <form className="mt-4 space-y-3" onSubmit={handleCreate}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      Nom
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="Entrepôt Paris"
                      />
                    </label>
                    <label className="text-sm text-ink-700">
                      Code
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="PAR"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-ink-800">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300"
                      />
                      Activer
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300"
                      />
                      Définir par défaut
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    {message ? <p className="text-xs text-ink-600">{message}</p> : <span />}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                        disabled={createLocation.isPending}
                      >
                        {createLocation.isPending ? "Création…" : "Créer"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default Locations;
