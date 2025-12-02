import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";

function Locations() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const { data: locations = [] } = useStockLocations({ active: activeOnly ? true : undefined });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Emplacements</h2>
            <p className="text-xs text-ink-500">
              /stock-locations{activeOnly ? "?active=true" : ""} et /stock-locations/default
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveOnly((prev) => !prev)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeOnly ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"
              }`}
              title="Ajoute ?active=true au listing"
            >
              {activeOnly ? "Actifs" : "Tous"}
            </button>
            <span className="pill bg-brand-50 text-brand-700">{locations.length} emplacements</span>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                loc.isDefault ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"
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
                  title="PATCH /stock-locations/:id avec isDefault=true"
                  disabled={updateLocation.isPending}
                >
                  {loc.isDefault ? "Par défaut" : "Définir défaut"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateLocation.mutate({ id: loc.id, payload: { isActive: !(loc.isActive ?? true) } })
                  }
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700 shadow-sm"
                  disabled={updateLocation.isPending}
                  title="PATCH /stock-locations/:id avec isActive"
                >
                  {loc.isActive ?? true ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {message ? <p className="mt-2 text-xs text-ink-600">{message}</p> : null}
        {currentDefaultId && !activeOnly ? (
          <p className="mt-1 text-[11px] text-ink-500">Réponse /stock-locations/default : #{currentDefaultId}</p>
        ) : null}
      </div>

      <form className="glass-panel p-4" onSubmit={handleCreate}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Ajouter un emplacement</h3>
          <span className="pill bg-brand-50 text-brand-700">PUT /stock-locations</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
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
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-ink-800">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            Activer l'emplacement
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            En faire le défaut
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink-500">Payload: name, code, isActive, isDefault</p>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            disabled={createLocation.isPending}
          >
            {createLocation.isPending ? "Création…" : "Créer l'emplacement"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Locations;
