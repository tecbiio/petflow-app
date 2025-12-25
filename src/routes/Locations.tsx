import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "../lib/queryClient";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ToastProvider";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

function Locations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeOnly, setActiveOnly] = useState(true);
  const { data: locations = [] } = useStockLocations({ active: activeOnly ? true : undefined });
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hasActiveFilters = Boolean(search.trim() || !activeOnly);

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
      toast("Emplacement mis à jour", "success");
    },
    onError: (error: Error) => toast(error.message, "error"),
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
      <PageHeader
        title="Emplacements"
        subtitle="Gestion des zones de stockage et emplacements par défaut."
        actions={
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            Nouvel emplacement
          </button>
        }
      />

      <div className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou code"
            className="input md:w-72"
          />
          <button
            type="button"
            onClick={() => setActiveOnly((prev) => !prev)}
            className={["btn", activeOnly ? "btn-secondary" : "btn-outline"].join(" ")}
          >
            {activeOnly ? "Actifs" : "Tous"}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveOnly(true);
              }}
              className="btn btn-muted"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        <span className="text-sm font-semibold text-ink-700">{filtered.length} résultats</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun emplacement"
          description={
            hasActiveFilters ? "Aucun résultat pour ces filtres." : "Crée un emplacement pour commencer."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveOnly(true);
                  }}
                  className="btn btn-muted"
                >
                  Réinitialiser
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setShowCreateModal(true);
                }}
                className="btn btn-primary"
              >
                Nouvel emplacement
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              className={[
                "panel flex items-center justify-between gap-3",
                loc.isDefault ? "border-brand-200" : "border-ink-100",
              ].join(" ")}
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
                  className={["btn btn-xs rounded-full", loc.isDefault ? "btn-primary" : "btn-muted"].join(" ")}
                  disabled={updateLocation.isPending}
                >
                  {loc.isDefault ? "Par défaut" : "Définir défaut"}
                </button>
                <button
                  type="button"
                  onClick={() => updateLocation.mutate({ id: loc.id, payload: { isActive: !(loc.isActive ?? true) } })}
                  className="btn btn-xs rounded-full btn-outline"
                  disabled={updateLocation.isPending}
                >
                  {loc.isActive ?? true ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Nouvel emplacement"
        description="Définis un nom, un code et son statut."
        size="md"
        canClose={!createLocation.isPending}
      >
        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-ink-700">
              Nom
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 input"
                placeholder="Entrepôt Paris"
              />
            </label>
            <label className="text-sm text-ink-700">
              Code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 input"
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
                className="btn btn-muted"
                disabled={createLocation.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createLocation.isPending}
              >
                {createLocation.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Locations;
