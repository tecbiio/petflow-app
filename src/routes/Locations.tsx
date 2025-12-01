import { useState } from "react";
import { useStockLocations } from "../hooks/useStockLocations";

function Locations() {
  const { data: locations = [] } = useStockLocations();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const writesDisabled = true;

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
                disabled
                className={`rounded-full px-3 py-1 text-xs font-semibold ${loc.isDefault ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"} cursor-not-allowed`}
              >
                {loc.isDefault ? "Par défaut" : "Lecture seule"}
              </button>
            </div>
          ))}
        </div>
        {writesDisabled ? <p className="mt-2 text-xs text-amber-700">Définir un nouvel emplacement par défaut nécessite un endpoint PATCH dans le core.</p> : null}
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
              disabled={writesDisabled}
            />
          </label>
          <label className="text-sm text-ink-700">
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              placeholder="PAR"
              disabled={writesDisabled}
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled
            className="rounded-lg bg-ink-300 px-4 py-2 text-sm font-semibold text-white opacity-70"
          >
            Bientôt disponible (API)
          </button>
        </div>
      </div>
    </div>
  );
}

export default Locations;
