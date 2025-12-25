import { FormEvent, useState } from "react";
import { useMutation } from "../lib/queryClient";
import ConfirmModal from "./ConfirmModal";
import { api } from "../api/client";
import { DocumentType, ParsedDocumentLine, MovementSign } from "../types";

type Props = {
  stockLocationId: number;
};

function UploadDropzone({ stockLocationId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("FACTURE");
  const [movementSign, setMovementSign] = useState<MovementSign>("OUT");
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedDocumentLine[] | null>(null);
  const [sourceName, setSourceName] = useState<string | undefined>(undefined);

  const parseMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Aucun fichier sélectionné");
      return api.parseDocument(file, docType);
    },
    onSuccess: (data) => {
      if (!data.lines || data.lines.length === 0) {
        setPreview(null);
        setMessage("Aucune ligne produit détectée dans le PDF.");
        return;
      }
      setPreview(data.lines);
      setMessage(`Fichier parsé (${data.lines.length} lignes). Vérifiez avant validation.`);
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const ingestMutation = useMutation({
    mutationFn: () =>
      api.ingestDocument({
        docType,
        stockLocationId,
        sourceDocumentId: sourceName,
        movementSign,
        createdAt,
        lines: preview ?? [],
      }),
    onSuccess: (res) => {
      const details = [
        `Mouvements créés: ${res.created}`,
        res.productsCreated !== undefined ? `Produits créés: ${res.productsCreated}` : null,
        res.productsLinked !== undefined ? `Liens Axonaut: ${res.productsLinked}` : null,
        `Ignorés: ${res.skipped.length}`,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" • ");
      setMessage(details);
      setPreview(null);
      setFile(null);
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setSourceName(dropped.name);
      setMessage(null);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setSourceName(picked.name);
      setMessage(null);
    }
  };

  const handleParse = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setPreview(null);
    parseMutation.mutate();
  };

  const defaultSignForDoc = (type: DocumentType): MovementSign => {
    switch (type) {
      case "FACTURE":
        return "IN"; // option inversée par défaut
      case "AVOIR":
        return "OUT";
      default:
        return "IN";
    }
  };

  return (
    <>
      <form
        onSubmit={handleParse}
        className="glass-panel space-y-3 border-2 border-dashed border-brand-200 px-4 py-6 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e as unknown as React.DragEvent<HTMLDivElement>)}
      >
        <p className="text-sm font-semibold text-ink-900">Importer un document (PDF)</p>
        <p className="text-xs text-ink-500">
          Choisissez un PDF (facture/avoir/BL), on parse côté core en Node (sans Python) puis on prépare les mouvements avant confirmation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-ink-800">
          <label className="inline-flex items-center gap-2">
            Type
            <select
              value={docType}
              onChange={(e) => {
                const next = e.target.value as DocumentType;
                setDocType(next);
                setMovementSign(defaultSignForDoc(next));
              }}
              className="input !w-auto"
            >
              <option value="FACTURE">Facture</option>
              <option value="AVOIR">Avoir</option>
              <option value="BON_LIVRAISON">Bon de livraison</option>
              <option value="AUTRE">Autre</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            Sens des mouvements
            <select
              value={movementSign}
              onChange={(e) => setMovementSign(e.target.value as MovementSign)}
              className="input !w-auto"
            >
              <option value="IN">Entrée (+)</option>
              <option value="OUT">Sortie (-)</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            Date des mouvements
            <input
              type="date"
              value={createdAt ?? ""}
              onChange={(e) => setCreatedAt(e.target.value || undefined)}
              className="input !w-auto"
            />
          </label>
          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
            Emplacement #{stockLocationId}
          </span>
        </div>
        <label className="btn btn-primary mt-2 cursor-pointer">
          Parcourir…
          <input
            type="file"
            className="hidden"
            onChange={handleSelect}
            accept=".pdf"
          />
        </label>
        {file ? <p className="text-sm text-ink-700">Sélectionné : {file.name}</p> : null}
        {message ? <p className="text-xs text-ink-600">{message}</p> : null}
        <div className="flex justify-center">
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={!file || parseMutation.isPending}
          >
            {parseMutation.isPending ? "Analyse…" : "Analyser"}
          </button>
        </div>
      </form>
      {preview ? (
        <ConfirmModal
          title="Vérification des lignes détectées"
          description="Confirmez pour créer les mouvements de stock."
          size="xl"
          onClose={() => setPreview(null)}
          onConfirm={() => ingestMutation.mutate()}
          canClose={!ingestMutation.isPending}
          cancelDisabled={ingestMutation.isPending}
          confirmDisabled={ingestMutation.isPending}
          confirmLabel={ingestMutation.isPending ? "Création…" : "Valider les mouvements"}
        >
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-ink-600">
                  <th className="px-2 py-1">Référence</th>
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1">Axonaut</th>
                  <th className="px-2 py-1">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((line, idx) => (
                  <tr key={idx} className="border-t border-ink-100">
                    <td className="px-2 py-1">{line.reference}</td>
                    <td className="px-2 py-1 text-ink-600">{line.description ?? "—"}</td>
                    <td className="px-2 py-1 text-ink-600">
                      {line.axonautProductId ? (
                        <span className="rounded-full bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700">
                          #{line.axonautProductId}
                          {line.axonautProductName ? ` · ${line.axonautProductName}` : ""}
                        </span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 font-semibold">{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ingestMutation.isError ? (
            <p className="mt-2 text-xs text-amber-700">{(ingestMutation.error as Error).message}</p>
          ) : null}
        </ConfirmModal>
      ) : null}
    </>
  );
}

export default UploadDropzone;
