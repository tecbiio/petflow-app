import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";

function Locations() {
  const { data: locations = [] } = useStockLocations();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const createMutation = useMutation({
    mutationFn: () => api.createStockLocation({ name, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockLocations"] });
      setName("");
      setCode("");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (locationId: string) => api.setDefaultStockLocation(locationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stockLocations"] }),
  });

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Emplacements</h2>
            <p className="text-xs text-ink-500">/stock-locations et /stock-locations/default</p>
          </div>
          <span className="pill bg-brand-50 text-brand-700">{locations.length} actifs</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${loc.isDefault ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"}`}
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">{loc.name}</p>
                <p className="text-xs text-ink-500">{loc.code || "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => defaultMutation.mutate(loc.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${loc.isDefault ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
              >
                {loc.isDefault ? "Par défaut" : "Définir par défaut"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-ink-900">Ajouter un emplacement</h3>
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
        <div className="mt-3 flex items-center justify-end gap-2">
          {createMutation.isSuccess ? <p className="text-xs text-emerald-700">Emplacement ajouté</p> : null}
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export default Locations;
